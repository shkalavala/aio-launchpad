"use client";

import { Badge } from "@/components/ui/Badge";
import type { ChangeState } from "@/lib/git/model";

const STATE_META: Record<
  ChangeState,
  { label: string; tone: "success" | "warning" | "accent" | "danger"; hint: string }
> = {
  "in-sync": {
    label: "In sync",
    tone: "success",
    hint: "Working tree matches the branch and the portal matches git.",
  },
  "local-change": {
    label: "Local change",
    tone: "warning",
    hint: "You have staged edits that are not yet committed. Resolve via Commit or Pull Request.",
  },
  "pending-pr": {
    label: "Pending PR",
    tone: "accent",
    hint: "A pull request is open. It rolls out when the PR is merged (the approval gate).",
  },
  drift: {
    label: "Drift",
    tone: "danger",
    hint: "Portal/deployed state diverges from git. Resolve by capturing to git or re-running the pipeline.",
  },
};

export function ChangeStatePill({ state }: { state: ChangeState }) {
  const meta = STATE_META[state];
  return (
    <Badge tone={meta.tone} title={meta.hint}>
      {meta.label}
    </Badge>
  );
}

export { STATE_META };
