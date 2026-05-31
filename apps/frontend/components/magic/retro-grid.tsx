"use client";

import { cn } from "@/lib/utils";

interface RetroGridProps {
  className?: string;
  angle?: number;
}

export function RetroGrid({ className, angle = 65 }: RetroGridProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [perspective:200px]",
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `rotateX(${angle}deg)` }}
      >
        <div className="animate-retro-grid absolute inset-[-50%] bg-[linear-gradient(to_right,rgba(139,92,246,0.15)_1px,transparent_0),linear-gradient(to_bottom,rgba(139,92,246,0.15)_1px,transparent_0)] bg-[size:60px_60px]" />
      </div>
    </div>
  );
}
