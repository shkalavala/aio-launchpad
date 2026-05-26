import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 rounded border border-border-strong bg-surface px-2 text-[13px] text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        className,
      )}
      {...props}
    />
  );
}
