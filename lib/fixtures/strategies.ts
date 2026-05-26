// Named ring strategies — operator picks one on /upgrade (or browses on /rings).
// Each strategy is a small set of knobs that drive lib/upgrade.ts:planRollout().
//
// Vocabulary (persona-map.md §5): rings, canary, wave, gate. No "rollback".

export interface RingStrategy {
  id: string;
  name: string;
  /** One-line summary shown in pickers. */
  tagline: string;
  /** Longer paragraph shown on /rings. */
  description: string;
  /** Tone used to color the strategy chip. */
  tone: "fast" | "standard" | "cautious";
  canarySize: number;
  waveCount: 2 | 3;
}

export const RING_STRATEGIES: RingStrategy[] = [
  {
    id: "dev-only",
    name: "Dev-only canary",
    tagline: "1 dev canary · everyone else in one wave",
    description:
      "Picks a single dev site as canary, then rolls every remaining site in one wave. Fastest path through a release — appropriate when the AIO release has already baked elsewhere (e.g., another tenant) and you want it on prod tonight.",
    tone: "fast",
    canarySize: 1,
    waveCount: 2,
  },
  {
    id: "standard",
    name: "Standard",
    tagline: "1 canary · ~1/3 wave 1 · remainder wave 2",
    description:
      "Default plan. One canary (dev preferred), then roughly a third of the remaining selection in wave 1, and the rest in wave 2. Health-verify gates between every ring. The right choice when you don't have a specific reason to pick something else.",
    tone: "standard",
    canarySize: 1,
    waveCount: 3,
  },
  {
    id: "cautious",
    name: "Cautious",
    tagline: "2 canary · smaller waves · more observation",
    description:
      "Two canary sites (so you can compare behavior across two physical clusters) and the rest split into smaller waves. Use when the release notes flag a higher-risk change, when this is a major version jump, or when ops bandwidth is thin and you want every gate to count.",
    tone: "cautious",
    canarySize: 2,
    waveCount: 3,
  },
];

export const DEFAULT_RING_STRATEGY_ID = "standard";

export function getRingStrategy(id: string | null | undefined): RingStrategy {
  if (!id) return RING_STRATEGIES.find((s) => s.id === DEFAULT_RING_STRATEGY_ID)!;
  return RING_STRATEGIES.find((s) => s.id === id) ?? RING_STRATEGIES.find((s) => s.id === DEFAULT_RING_STRATEGY_ID)!;
}
