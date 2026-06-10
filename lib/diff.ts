// Lightweight, dependency-free diff helpers for the v2 surface.
//
// Two flavors:
//   - objectDiff(): structured field-level diff between a base template and a
//     site override. Drives the "global template vs site override" side-by-side
//     view (added / modified / removed). This is the primary, simplified view.
//   - lineDiff(): a compact LCS line diff used only when the user expands the
//     raw YAML. Per the v2 design constraints, raw YAML stays hidden until asked.

export type DiffStatus = "added" | "modified" | "removed" | "unchanged";

/** A single flattened field comparison between base and override. */
export interface FieldDiff {
  /** Dotted path, e.g. "brokerConfig.replicas". */
  key: string;
  status: DiffStatus;
  /** Value on the base/global template (undefined when added). */
  before?: unknown;
  /** Value on the override (undefined when removed). */
  after?: unknown;
}

/** Flatten a nested plain object into dotted-path leaf entries. */
function flatten(obj: unknown, prefix = "", out: Record<string, unknown> = {}): Record<string, unknown> {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      flatten(v, path, out);
    } else {
      out[path] = v;
    }
  }
  return out;
}

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Field-level diff of an override against a base. Keys present only on the
 * override are "added"; keys present only on the base are "removed"; keys on
 * both with different values are "modified". Unchanged keys are included so the
 * caller can choose to show full context or filter to changes only.
 */
export function objectDiff(base: unknown, override: unknown): FieldDiff[] {
  const a = flatten(base);
  const b = flatten(override);
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();
  return keys.map((key) => {
    const inA = key in a;
    const inB = key in b;
    if (inA && !inB) return { key, status: "removed" as const, before: a[key] };
    if (!inA && inB) return { key, status: "added" as const, after: b[key] };
    if (!eq(a[key], b[key])) return { key, status: "modified" as const, before: a[key], after: b[key] };
    return { key, status: "unchanged" as const, before: a[key], after: b[key] };
  });
}

/** Convenience: only the entries that actually differ. */
export function changedFields(base: unknown, override: unknown): FieldDiff[] {
  return objectDiff(base, override).filter((d) => d.status !== "unchanged");
}

export type LineStatus = "added" | "removed" | "unchanged";

export interface LineDiff {
  status: LineStatus;
  /** Line text without trailing newline. */
  text: string;
}

/**
 * Compact LCS-based line diff. Used for the optional raw-YAML expand only.
 * Good enough for short config blocks; not a general-purpose diff engine.
 */
export function lineDiff(before: string, after: string): LineDiff[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const n = a.length;
  const m = b.length;
  // LCS length table.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: LineDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ status: "unchanged", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ status: "removed", text: a[i] });
      i++;
    } else {
      out.push({ status: "added", text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ status: "removed", text: a[i++] });
  while (j < m) out.push({ status: "added", text: b[j++] });
  return out;
}

/** Render a plain object as simple two-space-indented YAML-ish text. */
export function toYamlish(obj: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (obj === null || obj === undefined) return "";
  if (typeof obj !== "object") return String(obj);
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      lines.push(`${pad}${k}:`);
      lines.push(toYamlish(v, indent + 1));
    } else if (Array.isArray(v)) {
      lines.push(`${pad}${k}:`);
      for (const item of v) lines.push(`${pad}  - ${typeof item === "object" ? JSON.stringify(item) : String(item)}`);
    } else {
      lines.push(`${pad}${k}: ${String(v)}`);
    }
  }
  return lines.filter(Boolean).join("\n");
}
