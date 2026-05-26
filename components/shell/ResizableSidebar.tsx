"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MIN_WIDTH = 200;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 288; // matches old w-72
const STORAGE_KEY = "aio-launchpad:sidebarWidth";

export function ResizableSidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(DEFAULT_WIDTH);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n) && n >= MIN_WIDTH && n <= MAX_WIDTH) setWidth(n);
      }
    } catch {
      // ignore
    }
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startXRef.current = e.clientX;
      startWidthRef.current = width;
      setDragging(true);
    },
    [width],
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(next);
      widthRef.current = next;
    };
    const onUp = () => {
      try {
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
      } catch {
        // ignore
      }
      setDragging(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [dragging]);

  // Latest-width ref so the mouseup persistence sees the current value.
  const widthRef = useRef(width);
  widthRef.current = width;

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-border bg-surface md:block",
        className,
      )}
      style={{ width }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onMouseDown={onMouseDown}
        onDoubleClick={() => {
          setWidth(DEFAULT_WIDTH);
          try {
            localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
          } catch {
            // ignore
          }
        }}
        className={cn(
          "absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize select-none",
          "hover:bg-accent/40 active:bg-accent/60",
          dragging && "bg-accent/60",
        )}
        title="Drag to resize · double-click to reset"
      />
    </aside>
  );
}
