import type { HealthStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABEL: Record<HealthStatus, string> = {
  healthy: "Healthy",
  degraded: "Needs attention",
  unhealthy: "Unhealthy",
};

const COLOR: Record<HealthStatus, string> = {
  healthy: "bg-success",
  degraded: "bg-warning",
  unhealthy: "bg-danger",
};

export function HealthDot({ status }: { status: HealthStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-fg">
      <span
        aria-hidden
        className={cn("inline-block h-2 w-2 rounded-full", COLOR[status])}
      />
      <span>{LABEL[status]}</span>
    </span>
  );
}
