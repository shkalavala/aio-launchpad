import type { RingStrategy } from "./strategies";
import { SAMPLE_APPS, type SampleApp } from "./sampleApps";
import { ARM_MODULES, type ArmModule } from "./armModules";

/**
 * AIO Solutions — the unified catalog.
 *
 * Per design decision 2026-05-28: today's `samples/apps/` (helm-shaped pod
 * installs) and `samples/modules/` (ARM/Bicep post-deployment changes) are
 * the same transport (Scale Kit pipeline → ARM) with different size /
 * intent. They collapse into one concept: **AIO Solution**. The distinction
 * is now a `tag` (sample vs module vs customer-authored), not a type.
 *
 * This file is a thin merge view over the two existing fixtures so we don't
 * lose anything en route. New entries should be added here once the
 * `lib/fixtures/sampleApps.ts` and `lib/fixtures/armModules.ts` files are
 * fully retired (which depends on the rollout-kind enum collapse — deferred
 * with the Changes model). For now those files remain the data source.
 *
 * Each Solution knows which underlying rollout kind to dispatch to via
 * `rolloutKind`. The picker and /apps page read from this list and route to
 * the appropriate per-kind store slice.
 */

export type SolutionTag = "sample" | "module" | "customer-authored";

export type SolutionCategory =
  | "demo"
  | "connector"
  | "secrets"
  | "workload"
  | "dataflow"
  | "identity"
  | "role";

export interface AioSolution {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** "sample" = from samples/apps/, "module" = from samples/modules/,
   *  "customer-authored" reserved for future customer-owned solutions. */
  tag: SolutionTag;
  category: SolutionCategory;
  /** Repo path under the connected Scale Kit fork. */
  repoPath: string;
  /** Suggested ring strategy id when first deployed. */
  defaultRingStrategyId: RingStrategy["id"];
  /** Env guidance. "any" for solutions that aren't env-scoped. */
  recommendedEnv: "dev" | "prod" | "any";
  /** What this solution creates / changes on each target cluster. */
  creates: string[];
  /** Optional per-site apply duration label (mostly used by module-tagged solutions). */
  estimatedDuration?: string;
  /**
   * Which underlying RolloutKind this solution dispatches to today.
   * Long-term these collapse into a single `solution` kind (gated on the
   * Changes model / Stack baselines work).
   */
  rolloutKind: "app" | "arm";
}

function fromApp(a: SampleApp): AioSolution {
  return {
    id: a.id,
    name: a.name,
    tagline: a.tagline,
    description: a.description,
    tag: "sample",
    category: a.kind,
    repoPath: a.repoPath,
    defaultRingStrategyId: a.defaultRingStrategyId,
    recommendedEnv: a.recommendedEnv,
    creates: a.creates,
    rolloutKind: "app",
  };
}

function fromModule(m: ArmModule): AioSolution {
  // Normalize armModule singular "secret" to solutions plural "secrets".
  const category: SolutionCategory = m.category === "secret" ? "secrets" : m.category;
  return {
    id: m.id,
    name: m.name,
    tagline: m.tagline,
    description: m.description,
    tag: "module",
    category,
    repoPath: m.repoPath,
    defaultRingStrategyId: "standard",
    recommendedEnv: "any",
    creates: m.changes,
    estimatedDuration: m.estimatedDuration,
    rolloutKind: "arm",
  };
}

export const SOLUTIONS: AioSolution[] = [
  ...SAMPLE_APPS.map(fromApp),
  ...ARM_MODULES.map(fromModule),
];

export function getSolution(id: string): AioSolution | undefined {
  return SOLUTIONS.find((s) => s.id === id);
}

/** Group helper for the catalog page filter chips. */
export const SOLUTION_CATEGORIES: ReadonlyArray<{ id: SolutionCategory | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "demo", label: "Demo" },
  { id: "connector", label: "Connectors" },
  { id: "secrets", label: "Secrets" },
  { id: "workload", label: "Workloads" },
  { id: "dataflow", label: "Dataflow" },
  { id: "identity", label: "Identity" },
  { id: "role", label: "Roles" },
];
