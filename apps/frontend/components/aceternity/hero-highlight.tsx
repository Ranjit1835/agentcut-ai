"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HeroHighlightProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function HeroHighlight({
  children,
  className,
  containerClassName,
}: HeroHighlightProps) {
  return (
    <div
      className={cn("group relative", containerClassName)}
    >
      <div className={cn("relative z-20", className)}>{children}</div>
    </div>
  );
}

interface HighlightProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function Highlight({ children, className, delay = 0.3 }: HighlightProps) {
  return (
    <motion.span
      initial={{ backgroundSize: "0% 100%" }}
      animate={{ backgroundSize: "100% 100%" }}
      transition={{
        duration: 1.2,
        ease: "easeInOut",
        delay,
      }}
      style={{
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        display: "inline",
      }}
      className={cn(
        "relative inline-block rounded-lg bg-gradient-to-r from-violet-500/30 via-cyan-500/30 to-violet-500/30 px-1 pb-1",
        className
      )}
    >
      {children}
    </motion.span>
  );
}
