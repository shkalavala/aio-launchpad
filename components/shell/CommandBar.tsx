import * as React from "react";
import { cn } from "@/lib/utils";

export function CommandBar({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-1 border-b border-border bg-surface px-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
