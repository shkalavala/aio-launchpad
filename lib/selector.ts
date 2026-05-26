import type { FleetSite } from "./types";

/**
 * Scale Kit-style selector parser. Mirrors the `siteops -l` / `--selector` flag,
 * but with quality-of-life on top:
 *   - Explicit clauses:  "env=prod,country=SE"
 *   - Aliases:           env → environment,  region → country
 *   - Barewords:         "prod"  → environment=prod
 *                        "SE"    → country=SE
 *                        "stockholm" → site=stockholm
 *     resolved against a value→key index built from the fleet's labels.
 *
 * Matches against a FleetSite's resolvedLabels (collapsed ancestry + self).
 */
const ALIASES: Record<string, string> = {
  env: "environment",
  region: "country",
};

export interface SelectorClause {
  key: string;
  value: string;
}

/** Value→key lookup table built from the fleet's resolved labels. */
export type LabelIndex = Record<string, string>;

export function buildLabelIndex(fleet: FleetSite[]): LabelIndex {
  const index: LabelIndex = {};
  for (const f of fleet) {
    for (const [key, value] of Object.entries(f.resolvedLabels)) {
      if (!value) continue;
      // Earliest binding wins for ambiguous values; in our data values are
      // unique per key so this is effectively a stable mapping.
      const k = value.toLowerCase();
      if (!(k in index)) index[k] = key;
    }
  }
  return index;
}

export function parseSelector(input: string, index?: LabelIndex): SelectorClause[] {
  if (!input.trim()) return [];
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part): SelectorClause | null => {
      if (part.includes("=")) {
        const [rawKey, ...rest] = part.split("=");
        const key = (rawKey ?? "").trim();
        const value = rest.join("=").trim();
        if (!key || !value) return null;
        return { key: ALIASES[key] ?? key, value };
      }
      // Bareword: try to resolve against the fleet's known label values.
      if (!index) return null;
      const resolved = index[part.toLowerCase()];
      if (!resolved) return null;
      return { key: resolved, value: part };
    })
    .filter((c): c is SelectorClause => c !== null);
}

export function matchesSelector(fleetSite: FleetSite, clauses: SelectorClause[]): boolean {
  if (clauses.length === 0) return true;
  const labels = fleetSite.resolvedLabels;
  return clauses.every((c) => labels[c.key]?.toLowerCase() === c.value.toLowerCase());
}

export function filterBySelector(
  fleet: FleetSite[],
  input: string,
  index?: LabelIndex,
): FleetSite[] {
  const clauses = parseSelector(input, index);
  return fleet.filter((f) => matchesSelector(f, clauses));
}

export function serializeSelector(clauses: SelectorClause[]): string {
  return clauses.map((c) => `${c.key}=${c.value}`).join(",");
}

/** Remove a single clause (by key+value) and return the new selector text. */
export function removeSelectorClause(
  input: string,
  key: string,
  value: string,
  index?: LabelIndex,
): string {
  const remaining = parseSelector(input, index).filter(
    (c) => !(c.key === key && c.value === value),
  );
  return serializeSelector(remaining);
}
