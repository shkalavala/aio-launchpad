import type { Environment } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EnvPill({ env }: { env: Environment }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-sm px-1.5 text-[11px] font-semibold uppercase tracking-wide",
        env === "prod"
          ? "bg-accent text-accent-fg"
          : "bg-bg-muted text-fg-muted border border-border",
      )}
    >
      {env}
    </span>
  );
}
