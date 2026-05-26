import type { AioReleaseId } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { DEFAULT_RELEASE } from "@/lib/fixtures/releases";

export function VersionBadge({ id }: { id: AioReleaseId }) {
  const isCurrent = id === DEFAULT_RELEASE.id;
  const numeric = Number(id);
  const tone =
    isCurrent
      ? "accent"
      : numeric >= Number(DEFAULT_RELEASE.id) - 1
        ? "neutral"
        : "warning";
  return (
    <Badge tone={tone} className="font-mono">
      {id}
      {isCurrent && <span className="ml-1 normal-case opacity-70">current</span>}
    </Badge>
  );
}
