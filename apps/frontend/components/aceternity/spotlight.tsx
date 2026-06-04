"use client";

import React, { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface SpotlightProps {
  className?: string;
  fill?: string;
}

export function Spotlight({
  className,
  fill = "rgba(139, 92, 246, 0.15)",
}: SpotlightProps) {
  const divRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!divRef.current) return;
      const rect = divRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      divRef.current.style.background = `radial-gradient(600px circle at ${x}px ${y}px, ${fill}, transparent 40%)`;
    },
    [fill]
  );

  const handleMouseLeave = useCallback(() => {
    if (divRef.current) {
      divRef.current.style.background = "transparent";
    }
  }, []);

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "pointer-events-auto absolute inset-0 z-0 transition-all duration-300",
        className
      )}
    />
  );
}
