"use client";

import React, { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Sparkle {
  id: string;
  x: string;
  y: string;
  color: string;
  size: number;
  delay: number;
  duration: number;
}

interface SparklesProps {
  children?: React.ReactNode;
  className?: string;
  color?: string;
  size?: number;
  count?: number;
}

const DEFAULT_COLORS = ["#8B5CF6", "#06B6D4", "#EC4899", "#A78BFA", "#22D3EE"];

function generateSparkle(
  color: string | undefined,
  size: number
): Sparkle {
  const sparkleColor =
    color ?? DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]!;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    color: sparkleColor,
    size: Math.max(6, size * (0.5 + Math.random() * 0.8)),
    delay: Math.random() * 0.4,
    duration: 0.6 + Math.random() * 1,
  };
}

function SparkleIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M80 0C80 0 84.2846 41.2925 99.496 60.504C114.707 79.7154 160 80 160 80C160 80 114.707 80.2846 99.496 99.496C84.2846 118.707 80 160 80 160C80 160 75.7154 118.707 60.504 99.496C45.2925 80.2846 0 80 0 80C0 80 45.2925 79.7154 60.504 60.504C75.7154 41.2925 80 0 80 0Z"
        fill={color}
      />
    </svg>
  );
}

export function Sparkles({
  children,
  className,
  color,
  size = 16,
  count = 8,
}: SparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  const regenerate = useCallback(() => {
    setSparkles(
      Array.from({ length: count }, () => generateSparkle(color, size))
    );
  }, [color, size, count]);

  useEffect(() => {
    regenerate();
    const interval = setInterval(regenerate, 3000);
    return () => clearInterval(interval);
  }, [regenerate]);

  return (
    <span className={cn("relative inline-block", className)}>
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.span
            key={sparkle.id}
            className="pointer-events-none absolute z-20 block"
            style={{ left: sparkle.x, top: sparkle.y }}
            initial={{ scale: 0, opacity: 0, rotate: 0 }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              rotate: [0, 180],
            }}
            transition={{
              duration: sparkle.duration,
              delay: sparkle.delay,
              ease: "easeInOut",
            }}
          >
            <SparkleIcon size={sparkle.size} color={sparkle.color} />
          </motion.span>
        ))}
      </AnimatePresence>
      {children && <span className="relative z-10">{children}</span>}
    </span>
  );
}
