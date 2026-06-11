// Edit a TEMPLATE's defaults (the riskiest tier) and turn the change into a
// real pull request, WITHOUT regenerating the file. Templates sit above sites
// in the inherits chain, so editing one changes the resolved config of every
// site that inherits the field and doesn't override it — that set is the
// "blast radius" we surface before staging.
//
// Two tiers (see lib/v2/format.ts templateRole):
//  - Fleet baseline (base-site.yaml): org-wide AIO defaults — aioRelease,
//    broker memory profile, default dataflow instance count, deploy options.
//  - Subscription/region (shared/<region>.yaml): subscription + location.

import { parseDocument } from "yaml";
import type { FleetSite, SiteTemplate } from "@/lib/types";
import type { FieldDelta } from "@/lib/v2/bindings";

/** A single editable template field, addressed by its YAML key path. */
export interface TemplateField {
  id: string;
  label: string;
  /** Key path into the YAML doc, e.g. ["properties", "aioRelease"]. */
  path: (string | number)[];
  /** Free-text vs a fixed set of choices. */
  kind: "text" | "select";
  options?: string[];
  hint?: string;
  /** Which tier this field belongs to. */
  tier: "baseline" | "subscription";
}

/** Fields available on the Fleet baseline template (base-site.yaml). */
export const BASELINE_FIELDS: TemplateField[] = [
  {
    id: "aioRelease",
    label: "AIO release",
    path: ["properties", "aioRelease"],
    kind: "text",
    hint: "Release moniker every inheriting site picks up unless it pins its own.",
    tier: "baseline",
  },
  {
    id: "memoryProfile",
    label: "Broker memory profile",
    path: ["parameters", "brokerConfig", "memoryProfile"],
    kind: "select",
    options: ["Low", "Medium", "High"],
    hint: "Default MQTT broker memory profile.",
    tier: "baseline",
  },
  {
    id: "defaultDataflowInstanceCount",
    label: "Default dataflow instances",
    path: ["parameters", "defaultDataflowInstanceCount"],
    kind: "text",
    hint: "Default dataflow profile instance count.",
    tier: "baseline",
  },
];

/** Fields available on a Subscription/region template (shared/<region>.yaml). */
export const SUBSCRIPTION_FIELDS: TemplateField[] = [
  {
    id: "subscription",
    label: "Azure subscription",
    path: ["subscription"],
    kind: "text",
    hint: "Subscription every site in this region inherits unless it overrides.",
    tier: "subscription",
  },
  {
    id: "location",
    label: "Azure region",
    path: ["location"],
    kind: "text",
    hint: "Azure region (slug, e.g. swedencentral) for sites in this template.",
    tier: "subscription",
  },
];

/** The editable fields for a template, chosen by which tier it is. */
export function templateFields(t: SiteTemplate): TemplateField[] {
  const hasBinding =
    !!(t as unknown as { subscription?: string }).subscription || !!t.location;
  return hasBinding ? SUBSCRIPTION_FIELDS : BASELINE_FIELDS;
}

/** Read a template's current values for its editable fields. */
export function readTemplateValues(text: string, fields: TemplateField[]): Record<string, string> {
  const doc = parseDocument(text);
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = doc.getIn(f.path);
    out[f.id] = v == null ? "" : String(v);
  }
  return out;
}

/** Apply field edits to a template YAML, preserving comments and key order. */
export function patchTemplateYaml(
  text: string,
  fields: TemplateField[],
  values: Record<string, string>,
): string {
  const doc = parseDocument(text);
  for (const f of fields) {
    const raw = values[f.id]?.trim() ?? "";
    if (raw === "") continue;
    // Numbers stay numbers in YAML; everything else is a string scalar.
    const isNumeric = f.id === "defaultDataflowInstanceCount";
    const value: unknown = isNumeric && /^\d+$/.test(raw) ? Number(raw) : raw;
    doc.setIn(f.path, value);
  }
  return doc.toString();
}

/** Before -> after deltas for the fields that actually changed. */
export function templateDeltas(
  fields: TemplateField[],
  before: Record<string, string>,
  values: Record<string, string>,
): FieldDelta[] {
  const deltas: FieldDelta[] = [];
  for (const f of fields) {
    const next = values[f.id]?.trim() ?? "";
    if (next === "" || next === (before[f.id] ?? "")) continue;
    deltas.push({
      field: f.id as FieldDelta["field"],
      label: f.label,
      before: before[f.id] || "—",
      after: next,
    });
  }
  return deltas;
}

/**
 * Blast radius: which fleet sites would actually change if these template
 * fields were edited. A site is affected when (a) the template is in its
 * ancestry chain, and (b) for at least one changed field, no closer template
 * and not the site itself overrides the value it inherits from this template.
 *
 * Subtlety: FleetSite.site is the RESOLVED site — the fleet loader fills in
 * subscription / resourceGroup / location from ancestry, so a populated value
 * there does NOT mean the leaf set it. We detect a real leaf override by
 * comparing the resolved value to what the ancestry alone supplies: if they
 * differ, the leaf owns it (and thus shadows this template).
 */
export function blastRadius(
  templateName: string,
  changedFieldIds: string[],
  fleet: FleetSite[],
  allFields: TemplateField[],
): string[] {
  const byId = new Map(allFields.map((f) => [f.id, f]));
  const affected = new Set<string>();

  for (const fs of fleet) {
    const idx = fs.ancestry.findIndex((t) => t.name === templateName);
    if (idx === -1) continue; // template not in this site's chain

    // Templates closer to the leaf than ours (they'd shadow our value).
    const closer = fs.ancestry.slice(idx + 1);

    for (const fid of changedFieldIds) {
      const f = byId.get(fid);
      if (!f) continue;
      // Does any closer template set this field? Then it shadows us.
      const shadowed = closer.some(
        (t) => getAtPath(t as unknown as Record<string, unknown>, f.path) != null,
      );
      if (shadowed) continue;

      // What the ancestry chain alone supplies for this field (most-specific
      // wins). With closer templates excluded above, this is our value or an
      // ancestor's — i.e. what the leaf would inherit.
      const inherited = ancestryValue(fs.ancestry, f.path);
      const resolved = getAtPath(fs.site as unknown as Record<string, unknown>, f.path);
      // The leaf overrides only if its resolved value differs from inherited.
      const leafOverrides =
        resolved != null && inherited != null && String(resolved) !== String(inherited);
      if (leafOverrides) continue;

      // Nothing closer overrides — this site inherits our value for this field.
      affected.add(fs.site.name);
      break;
    }
  }

  return Array.from(affected).sort();
}

/** Most-specific (closest-to-leaf) ancestry value for a key path, else undefined. */
function ancestryValue(ancestry: SiteTemplate[], path: (string | number)[]): unknown {
  let val: unknown;
  for (const t of ancestry) {
    const v = getAtPath(t as unknown as Record<string, unknown>, path);
    if (v != null) val = v;
  }
  return val;
}

/** Walk a plain object by key path; returns undefined if any hop is missing. */
function getAtPath(obj: Record<string, unknown> | undefined, path: (string | number)[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key as string];
  }
  return cur;
}

/** Branch name for a (possibly multi-file) defaults/binding PR. */
export function changeBranch(): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `launchpad/edit-defaults-${stamp}`;
}
