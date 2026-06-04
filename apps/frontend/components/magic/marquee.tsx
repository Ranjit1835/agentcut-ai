"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps {
  children: React.ReactNode;
  className?: string;
  direction?: "left" | "right";
  speed?: number;
  pauseOnHover?: boolean;
  reverse?: boolean;
}

export function Marquee({
  children,
  className,
  direction = "left",
  speed = 40,
  pauseOnHover = true,
  reverse = false,
}: MarqueeProps) {
  const shouldReverse = direction === "right" || reverse;

  return (
    <div
      className={cn(
        "group flex overflow-hidden [--gap:1rem] [gap:var(--gap)]",
        className
      )}
      style={
        {
          "--duration": `${speed}s`,
        } as React.CSSProperties
      }
    >
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            shouldReverse ? "animate-marquee-reverse" : "animate-marquee",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
          style={{
            animationDuration: `var(--duration)`,
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
