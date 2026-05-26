"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ExternalLink, Plus, Sparkles, X } from "lucide-react";
import type { AioReleaseId } from "@/lib/types";
import { DEFAULT_RELEASE, RELEASES } from "@/lib/fixtures/releases";
import {
  KNOWN_FACTORY_SITES,
  KNOWN_PLANTS,
  KNOWN_ENVIRONMENTS,
  SLUG_RE,
  type NewSiteInput,
  deriveSiteName,
  deriveParentTemplateName,
  deriveResourceGroup,
  deriveSubscription,
  deriveAioInstanceName,
  validateNewSite,
  templateExists,
  siteExists,
} from "@/lib/newsite";
import { COUNTRY_NAMES, SITE_DISPLAY, FACTORY_DISPLAY, TEMPLATES } from "@/lib/fixtures/sites";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface Props {
  value: NewSiteInput;
  onChange: (next: NewSiteInput) => void;
  pendingNames: string[];
  locked: boolean;
}

// Conventional country mapping for the seeded factory sites. Custom geos
// just show without a country suffix.
const FACTORY_COUNTRY: Record<string, string> = {
  stockholm: "SE",
  hamburg: "DE",
  gothenburg: "SE",
};

/**
 * Add-a-site form. Operators pick (or invent) a factory site, an environment,
 * and optionally a plant. The fixture values seed the picker, but every field
 * accepts new slugs — fleets grow, conventions vary, and the form should not
 * box that in. Day-1 prereqs (UAMI / KV / VNet) are still Central IT.
 * See [persona-map.md §3.2].
 */
export function AddSiteForm({ value, onChange, pendingNames, locked }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const validation = validateNewSite(value, pendingNames);
  const derivedName = deriveSiteName(value);
  const derivedRg = deriveResourceGroup(value);
  const derivedSub = deriveSubscription(value);
  const derivedAioInstance = deriveAioInstanceName(value);
  const parentTemplate = deriveParentTemplateName(value);

  const set = (patch: Partial<NewSiteInput>) => onChange({ ...value, ...patch });

  // Discovered options = known + anything used in templates/the current form
  // value. Once an operator adds "edge" once, it sticks around for the rest
  // of the session.
  const discoveredFactorySites = collectDistinct([
    ...KNOWN_FACTORY_SITES,
    value.factorySite,
    ...TEMPLATES.flatMap((t) => labelValues(t, "factorySite")),
  ]);
  const discoveredEnvironments = collectDistinct([
    ...KNOWN_ENVIRONMENTS,
    value.environment,
    ...TEMPLATES.flatMap((t) => labelValues(t, "environment")),
  ]);
  const discoveredPlants = collectDistinct([
    ...KNOWN_PLANTS,
    value.plant ?? "",
    ...TEMPLATES.flatMap((t) => labelValues(t, "plant")),
  ]);

  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[14px] font-semibold text-fg">New AIO instance</h2>
        <span className="text-[11px] uppercase tracking-wide text-fg-subtle">
          {parentTemplate ? `Inherits manifest from ${parentTemplate}.yaml` : "Standalone (no parent template)"}
        </span>
      </header>

      <div className="rounded border border-border bg-surface p-4">
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-3">
          <Field label="Factory site" hint="Geo / site slug. Add a new one if your fleet has grown.">
            <ChipPicker
              value={value.factorySite}
              options={discoveredFactorySites}
              onChange={(v) => set({ factorySite: v })}
              renderLabel={(fs) =>
                FACTORY_COUNTRY[fs]
                  ? `${SITE_DISPLAY[fs] ?? fs}, ${COUNTRY_NAMES[FACTORY_COUNTRY[fs]] ?? FACTORY_COUNTRY[fs]}`
                  : (SITE_DISPLAY[fs] ?? fs)
              }
              optionStatus={(fs) => (templateExists(fs)
                ? { kind: "existing", title: `shared/${fs}.yaml exists` }
                : { kind: "new", title: "New factory site — no shared template yet" })}
              addLabel="Add factory site"
              locked={locked}
            />
          </Field>

          <Field label="Environment" hint="dev / prod ship with the fixtures; staging, qa, edge, etc. work too.">
            <ChipPicker
              value={value.environment}
              options={discoveredEnvironments}
              onChange={(v) => set({ environment: v })}
              renderLabel={(env) => env.toUpperCase()}
              optionStatus={(env) => {
                const name = deriveSiteName({ ...value, environment: env });
                return name && siteExists(name, pendingNames)
                  ? { kind: "existing", title: `Site ${name} already in fleet` }
                  : { kind: "new", title: name ? `Would create new site ${name}` : "" };
              }}
              addLabel="Add environment"
              locked={locked}
            />
          </Field>

          <Field label="Target AIO release" hint="Pin the new site to this release">
            <select
              value={value.aioRelease}
              disabled={locked}
              onChange={(e) => set({ aioRelease: e.target.value as AioReleaseId })}
              className="h-7 rounded-sm border border-border bg-bg px-2 text-[12px] disabled:opacity-60"
            >
              {RELEASES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — AIO {r.aioVersion}
                  {r.isDefault ? " (current)" : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Plant"
            hint="Optional. Use it when a site has multiple AIO instances by plant."
          >
            <ChipPicker
              value={value.plant ?? ""}
              options={discoveredPlants}
              onChange={(v) => set({ plant: v || undefined })}
              renderLabel={(p) => FACTORY_DISPLAY[p] ?? p}
              optionStatus={(p) => {
                if (!value.factorySite) return { kind: "new", title: "" };
                const tpl = `${value.factorySite}-${p}`;
                return templateExists(tpl)
                  ? { kind: "existing", title: `shared/${tpl}.yaml exists` }
                  : { kind: "new", title: `No shared/${tpl}.yaml — would inherit from shared/${value.factorySite}.yaml` };
              }}
              addLabel="Add plant"
              clearLabel="No plant"
              allowClear
              locked={locked}
            />
          </Field>
        </div>

        <div className="mt-4 border-t border-border-subtle pt-3 text-[12px]">
          <SiteNameStatus
            name={derivedName}
            collision={validation.collision}
            locked={locked}
            onSuggestUniqueName={() => {
              const base = validation.collision?.name ?? derivedName;
              const used = new Set(pendingNames);
              let i = 2;
              while (used.has(`${base}-${i}`)) i++;
              set({ nameOverride: `${base}-${i}` });
              setShowAdvanced(true);
            }}
          />
          <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 md:grid-cols-2">
            <DerivedRow label="Resource group" value={derivedRg} />
            <DerivedRow
              label="Inherits"
              value={parentTemplate ? `shared/${parentTemplate}.yaml` : "(standalone)"}
              status={parentTemplate ? (templateExists(parentTemplate) ? "existing" : "new") : undefined}
              statusLabel={parentTemplate ? (templateExists(parentTemplate) ? "template exists" : "template not yet defined") : undefined}
            />
            <DerivedRow label="AIO instance name" value={derivedAioInstance} />
            <DerivedRow label="Subscription" value={derivedSub} />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-3 text-[11px] uppercase tracking-wide text-accent hover:underline"
          >
            {showAdvanced ? "Hide overrides" : "Show overrides (name / RG / subscription / region / AIO instance)"}
          </button>
          {showAdvanced && (
            <>
              <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Site name override" hint="Use the derived name unless you must">
                <input
                  value={value.nameOverride ?? ""}
                  onChange={(e) => set({ nameOverride: e.target.value })}
                  disabled={locked}
                  placeholder={derivedName}
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px] disabled:opacity-60"
                />
              </Field>
              <Field label="Resource group override" hint="Defaults to rg-<site>">
                <input
                  value={value.resourceGroupOverride ?? ""}
                  onChange={(e) => set({ resourceGroupOverride: e.target.value })}
                  disabled={locked}
                  placeholder={derivedRg}
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px] disabled:opacity-60"
                />
              </Field>
              <Field
                label="Subscription override"
                hint="GUID. Useful when each factory site has its own Azure subscription."
              >
                <input
                  value={value.subscriptionOverride ?? ""}
                  onChange={(e) => set({ subscriptionOverride: e.target.value })}
                  disabled={locked}
                  placeholder={derivedSub}
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px] disabled:opacity-60"
                />
              </Field>
              <Field
                label="Region override"
                hint="Azure region slug (e.g. swedencentral). Defaults to the inherited geo template's region."
              >
                <input
                  value={value.locationOverride ?? ""}
                  onChange={(e) => set({ locationOverride: e.target.value })}
                  disabled={locked}
                  placeholder="swedencentral"
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px] disabled:opacity-60"
                />
              </Field>
              <Field
                label="AIO instance name override"
                hint="Defaults to <site>-aio. One AIO instance per site is typical."
              >
                <input
                  value={value.aioInstanceNameOverride ?? ""}
                  onChange={(e) => set({ aioInstanceNameOverride: e.target.value })}
                  disabled={locked}
                  placeholder={derivedAioInstance}
                  className="h-7 w-full rounded-sm border border-border bg-bg px-2 font-mono text-[12px] disabled:opacity-60"
                />
              </Field>
            </div>
            </>
          )}
        </div>

        {(validation.errors.length > 0 || validation.warnings.length > 0) && (
          <div className="mt-3 space-y-1">
            {validation.errors
              // Suppress the duplicate-name error when the polished collision
              // callout above is already speaking to it.
              .filter((e) => !(validation.collision && e.startsWith(`A site named "${validation.collision.name}"`)))
              .map((e) => (
                <div key={e} className="flex items-baseline gap-2 text-[12px] text-danger-fg">
                  <Badge tone="danger">Error</Badge>
                  <span>{e}</span>
                </div>
              ))}
            {validation.warnings.map((w) => (
              <div key={w} className="flex items-baseline gap-2 text-[12px] text-warning-fg">
                <Badge tone="warning">Note</Badge>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {validation.ok && !locked && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-fg-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>
              Ready to preview. {SITE_DISPLAY[value.factorySite] ?? value.factorySite}
              {value.plant && (
                <>
                  <ChevronRight className="mx-0.5 inline h-3 w-3" />
                  {FACTORY_DISPLAY[value.plant] ?? value.plant}
                </>
              )}
              <ChevronRight className="mx-0.5 inline h-3 w-3" />
              {value.environment.toUpperCase()}
              <ChevronRight className="mx-0.5 inline h-3 w-3" />
              AIO {RELEASES.find((r) => r.id === value.aioRelease)?.aioVersion}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

type ChipStatus = { kind: "existing" | "new"; title: string };

interface ChipPickerProps {
  value: string;
  options: string[];
  onChange: (next: string) => void;
  renderLabel?: (v: string) => string;
  optionStatus?: (v: string) => ChipStatus | undefined;
  addLabel: string;
  clearLabel?: string;
  allowClear?: boolean;
  locked?: boolean;
}

/**
 * Chips of known/discovered options + an inline "add custom" input so an
 * operator can introduce a new slug without leaving the form. Custom values
 * are validated against SLUG_RE at the call site (via validateNewSite).
 */
function ChipPicker({
  value,
  options,
  onChange,
  renderLabel = (v) => v,
  optionStatus,
  addLabel,
  clearLabel,
  allowClear,
  locked,
}: ChipPickerProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim().toLowerCase();
    if (!v) {
      setAdding(false);
      return;
    }
    if (!SLUG_RE.test(v)) {
      // Let the form-level validation banner surface the rule. Just bail.
      return;
    }
    onChange(v);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {allowClear && (
        <button
          type="button"
          disabled={locked}
          onClick={() => onChange("")}
          className={cn(
            "rounded-sm border px-2 py-1 text-[12px]",
            value === ""
              ? "border-accent bg-accent-subtle text-accent"
              : "border-dashed border-border bg-transparent text-fg-muted hover:bg-bg-subtle",
            locked && "opacity-60",
          )}
        >
          {clearLabel ?? "None"}
        </button>
      )}
      {options.map((opt) => {
        const active = value === opt;
        const status = optionStatus?.(opt);
        return (
          <button
            key={opt}
            type="button"
            disabled={locked}
            onClick={() => onChange(opt)}
            title={status?.title}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[12px]",
              active
                ? "border-accent bg-accent-subtle text-accent"
                : "border-border bg-bg-subtle hover:bg-bg-subtle/80",
              locked && "opacity-60",
            )}
          >
            {status && (
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  status.kind === "existing" ? "bg-success-fg" : "border border-fg-subtle",
                )}
                aria-hidden
              />
            )}
            {renderLabel(opt)}
          </button>
        );
      })}

      {adding ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit();
              } else if (e.key === "Escape") {
                setAdding(false);
                setDraft("");
              }
            }}
            onBlur={commit}
            placeholder="new-slug"
            className="h-7 w-32 rounded-sm border border-accent bg-bg px-2 font-mono text-[12px]"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            className="rounded-sm border border-accent bg-accent-subtle px-1.5 py-1 text-accent"
            title="Add"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
            className="rounded-sm border border-border bg-bg-subtle px-1.5 py-1 text-fg-muted"
            title="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          disabled={locked}
          onClick={() => setAdding(true)}
          className={cn(
            "flex items-center gap-1 rounded-sm border border-dashed border-border bg-transparent px-2 py-1 text-[12px] text-fg-muted hover:bg-bg-subtle",
            locked && "opacity-60",
          )}
        >
          <Plus className="h-3 w-3" />
          {addLabel}
        </button>
      )}
    </div>
  );
}

function collectDistinct(values: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function labelValues(template: { labels?: Record<string, string> }, key: string): string[] {
  const v = template.labels?.[key];
  return v ? [v] : [];
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  // Intentionally a <div>, not a <label>. The chip pickers contain multiple
  // <button>s; a <label> would redirect any inner click to its first form
  // control, which silently breaks the "Add custom" affordance.
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-fg-subtle">{hint}</span>}
    </div>
  );
}

function DerivedRow({
  label,
  value,
  status,
  statusLabel,
}: {
  label: string;
  value: string;
  status?: "existing" | "new";
  statusLabel?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-36 shrink-0 text-fg-subtle">{label}</span>
      <code className="truncate font-mono text-fg">{value}</code>
      {status && statusLabel && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px]",
            status === "existing" ? "text-success-fg" : "text-fg-subtle",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              status === "existing" ? "bg-success-fg" : "border border-fg-subtle",
            )}
            aria-hidden
          />
          {statusLabel}
        </span>
      )}
    </div>
  );
}

/**
 * Persistent status surface for the resolved site name. Three states:
 *   - empty: fields above incomplete, nothing to validate
 *   - available: derived name is free, ready to submit
 *   - collision: name matches an existing/pending site, with two inline
 *     exits (open the existing site, or auto-rename with `-2`/`-3`/…)
 *
 * The status pill is always visible, so the absence of a collision is as
 * legible as its presence — no ghost banner that appears and disappears.
 * Launchpad is a UX over a git-backed manifest repo; the new-site form
 * never edits an existing manifest, so a collision is a wrong-tool signal.
 */
function SiteNameStatus({
  name,
  collision,
  locked,
  onSuggestUniqueName,
}: {
  name: string;
  collision: { name: string; isPending: boolean } | undefined;
  locked: boolean;
  onSuggestUniqueName: () => void;
}) {
  const hasName = name.length > 0;
  const isCollision = !!collision;

  return (
    <div
      className={cn(
        "rounded border p-2.5",
        isCollision
          ? "border-warning/40 bg-warning-subtle"
          : hasName
            ? "border-success/30 bg-success-subtle"
            : "border-border-subtle bg-bg-subtle",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Site name</span>
        <code className="font-mono text-[13px] text-fg">{hasName ? name : "—"}</code>
        {isCollision ? (
          <Badge tone="warning">Already in fleet{collision.isPending ? " (this session)" : ""}</Badge>
        ) : hasName ? (
          <Badge tone="success">Not yet in fleet</Badge>
        ) : (
          <span className="text-[11px] text-fg-subtle">Fill the fields above</span>
        )}
        {isCollision && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Link
              href={`/fleet?site=${encodeURIComponent(collision.name)}`}
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg px-2 py-1 text-[11px] hover:bg-bg-subtle"
            >
              <ExternalLink className="h-3 w-3" />
              Open {collision.name}
            </Link>
            <button
              type="button"
              disabled={locked}
              onClick={onSuggestUniqueName}
              className="inline-flex items-center gap-1 rounded-sm border border-border bg-bg px-2 py-1 text-[11px] hover:bg-bg-subtle disabled:opacity-60"
              title="Fill 'Site name override' with a free name (appends -2, -3, …)"
            >
              <Plus className="h-3 w-3" />
              Auto-rename
            </button>
          </div>
        )}
      </div>
      {isCollision && (
        <p className="mt-1.5 text-[11px] text-fg-subtle">
          This form only creates new sites. To change an existing one, edit its manifest in the git repo.
        </p>
      )}
    </div>
  );
}

export const DEFAULT_NEW_SITE: NewSiteInput = {
  factorySite: "stockholm",
  environment: "dev",
  aioRelease: DEFAULT_RELEASE.id,
};
