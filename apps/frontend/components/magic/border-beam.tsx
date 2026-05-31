"use client";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 12,
  delay = 0,
  colorFrom = "#8B5CF6",
  colorTo = "#06B6D4",
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className
      )}
      style={{
        background: `conic-gradient(from calc(var(--beam-angle, 0) * 1deg), transparent 80%, ${colorFrom}, ${colorTo}, transparent 100%)`,
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        maskComposite: "exclude",
        WebkitMaskComposite: "xor",
        padding: "1px",
        animation: `beam-rotate ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  );
}
