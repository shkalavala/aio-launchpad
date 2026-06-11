// Edit an EXISTING site's Azure bindings (subscription / resource group / Arc
// cluster name) and turn the change into a real pull request, WITHOUT
// regenerating the file. We patch the bytes on disk so the leaf's comments,
// key order, and formatting survive — only the edited scalar nodes change.
//
// Boundary: same as authorSite — Launchpad authors the FLEET (a site's Azure
// binding is fleet identity, not the application). Subscription is inheritable
// from a region template; resourceGroup + clusterName are leaf-owned.

import { parseDocument } from "yaml";
import type { FleetSite, SiteTemplate } from "@/lib/types";
import type { FileChange } from "@/lib/github/writeClient";

/** The three editable Azure-binding fields on a leaf site. */
export interface LeafBindings {
  /** Top-level `subscription:` declared ON THE LEAF (undefined = inherited). */
  subscription?: string;
  /** Top-level `resourceGroup:` (leaf-owned). */
  resourceGroup?: string;
  /** `parameters.clusterName` (leaf-owned). */
  clusterName?: string;
}

/**
 * A binding edit to apply. For each field: a string sets/overrides it; `null`
 * removes the key (subscription only — resets it to inherited); `undefined`
 * leaves it untouched.
 */
export interface BindingEdit {
  subscription?: string | null;
  resourceGroup?: string;
  clusterName?: string;
}

/** Read the leaf-owned binding values out of a site YAML document. */
export function readLeafBindings(text: string): LeafBindings {
  const doc = parseDocument(text);
  const sub = doc.get("subscription");
  const rg = doc.get("resourceGroup");
  const cluster = doc.getIn(["parameters", "clusterName"]);
  return {
    subscription: typeof sub === "string" ? sub : undefined,
    resourceGroup: typeof rg === "string" ? rg : undefined,
    clusterName: typeof cluster === "string" ? cluster : undefined,
  };
}

/** Subscription a site inherits from its template chain (most-specific wins). */
export function inheritedSubscription(ancestry: SiteTemplate[]): string | undefined {
  let val: string | undefined;
  for (const t of ancestry) {
    const sub = (t as unknown as { subscription?: string }).subscription;
    if (sub) val = sub;
  }
  return val;
}

/**
 * Apply a BindingEdit to a site YAML document, preserving everything else.
 * - subscription: set string / delete on null (placed right after `inherits`
 *   when newly added so it reads naturally).
 * - resourceGroup: set in place (it already exists on every leaf).
 * - clusterName: set under `parameters`.
 * Returns the new YAML text, or the original unchanged when the edit is empty.
 */
export function patchSiteYaml(text: string, edit: BindingEdit): string {
  const doc = parseDocument(text);

  if (edit.subscription === null) {
    doc.delete("subscription");
  } else if (typeof edit.subscription === "string") {
    doc.set("subscription", edit.subscription);
  }

  if (typeof edit.resourceGroup === "string") {
    doc.set("resourceGroup", edit.resourceGroup);
  }

  if (typeof edit.clusterName === "string") {
    doc.setIn(["parameters", "clusterName"], edit.clusterName);
  }

  return doc.toString();
}

/** True when the edit actually changes at least one field vs the leaf. */
export function isMeaningfulEdit(before: LeafBindings, edit: BindingEdit): boolean {
  if (edit.subscription === null && before.subscription !== undefined) return true;
  if (typeof edit.subscription === "string" && edit.subscription !== before.subscription) return true;
  if (typeof edit.resourceGroup === "string" && edit.resourceGroup !== before.resourceGroup) return true;
  if (typeof edit.clusterName === "string" && edit.clusterName !== before.clusterName) return true;
  return false;
}

/** Human-readable field changes for the pending list, before -> after. */
export interface FieldDelta {
  field: "subscription" | "resourceGroup" | "clusterName";
  label: string;
  before: string;
  after: string;
}

export function bindingDeltas(
  before: LeafBindings,
  edit: BindingEdit,
  inheritedSub?: string,
): FieldDelta[] {
  const deltas: FieldDelta[] = [];
  const inheritedLabel = (v?: string) => (v ? `inherited (${v})` : "inherited");

  if (edit.subscription === null && before.subscription !== undefined) {
    deltas.push({
      field: "subscription",
      label: "Subscription",
      before: before.subscription,
      after: inheritedLabel(inheritedSub),
    });
  } else if (typeof edit.subscription === "string" && edit.subscription !== before.subscription) {
    deltas.push({
      field: "subscription",
      label: "Subscription",
      before: before.subscription ?? inheritedLabel(inheritedSub),
      after: edit.subscription,
    });
  }

  if (typeof edit.resourceGroup === "string" && edit.resourceGroup !== before.resourceGroup) {
    deltas.push({
      field: "resourceGroup",
      label: "Resource group",
      before: before.resourceGroup ?? "—",
      after: edit.resourceGroup,
    });
  }

  if (typeof edit.clusterName === "string" && edit.clusterName !== before.clusterName) {
    deltas.push({
      field: "clusterName",
      label: "Arc cluster name",
      before: before.clusterName ?? "—",
      after: edit.clusterName,
    });
  }

  return deltas;
}

/** Branch name for a (possibly multi-site) binding-edit PR. */
export function bindingsBranch(): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `launchpad/edit-bindings-${stamp}`;
}

/** Build the file change for one site's patched YAML. */
export function buildBindingFileChange(filePath: string, patchedText: string): FileChange {
  return { path: filePath, content: patchedText };
}

/** Resolve inherited subscription for a fleet site (convenience over ancestry). */
export function siteInheritedSubscription(fs: FleetSite): string | undefined {
  return inheritedSubscription(fs.ancestry);
}
