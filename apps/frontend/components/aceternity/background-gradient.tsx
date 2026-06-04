"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BackgroundGradientProps {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}

export function BackgroundGradient({
  children,
  className,
  containerClassName,
  animate = true,
}: BackgroundGradientProps) {
  const variants = {
    initial: { backgroundPosition: "0 50%" },
    animate: { backgroundPosition: ["0 50%", "100% 50%", "0 50%"] },
  };

  return (
    <div className={cn("group relative p-[4px]", containerClassName)}>
      <motion.div
        {...(animate
          ? {
              variants,
              initial: "initial" as const,
              animate: "animate" as const,
              transition: { duration: 5, repeat: Infinity, repeatType: "reverse" as const },
              style: { backgroundSize: "400% 400%" },
            }
          : {})}
        className={cn(
          "absolute inset-0 rounded-3xl opacity-60 blur-xl transition duration-500 group-hover:opacity-100",
          "bg-[radial-gradient(circle_farthest-side_at_0_100%,#8B5CF6,transparent),radial-gradient(circle_farthest-side_at_100%_0,#06B6D4,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#EC4899,transparent),radial-gradient(circle_farthest-side_at_0_0,#8B5CF6,#06B6D4)]"
        )}
      />
      <motion.div
        {...(animate
          ? {
              variants,
              initial: "initial" as const,
              animate: "animate" as const,
              transition: { duration: 5, repeat: Infinity, repeatType: "reverse" as const },
              style: { backgroundSize: "400% 400%" },
            }
          : {})}
        className={cn(
          "absolute inset-0 rounded-3xl",
          "bg-[radial-gradient(circle_farthest-side_at_0_100%,#8B5CF6,transparent),radial-gradient(circle_farthest-side_at_100%_0,#06B6D4,transparent),radial-gradient(circle_farthest-side_at_100%_100%,#EC4899,transparent),radial-gradient(circle_farthest-side_at_0_0,#8B5CF6,#06B6D4)]"
        )}
      />
      <div className={cn("relative z-10", className)}>{children}</div>
    </div>
  );
}

interface BackgroundGradientAnimationProps {
  children?: React.ReactNode;
  className?: string;
  gradientBackgroundStart?: string;
  gradientBackgroundEnd?: string;
  firstColor?: string;
  secondColor?: string;
  thirdColor?: string;
  fourthColor?: string;
  fifthColor?: string;
  pointerColor?: string;
  size?: string;
  blendingValue?: string;
  interactive?: boolean;
}

export function BackgroundGradientAnimation({
  children,
  className,
  gradientBackgroundStart = "rgb(10, 10, 15)",
  gradientBackgroundEnd = "rgb(10, 10, 15)",
  firstColor = "139, 92, 246",
  secondColor = "6, 182, 212",
  thirdColor = "236, 72, 153",
  fourthColor = "99, 102, 241",
  fifthColor = "139, 92, 246",
  pointerColor = "139, 92, 246",
  size = "80%",
  blendingValue = "hard-light",
  interactive = true,
}: BackgroundGradientAnimationProps) {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const curX = useRef(0);
  const curY = useRef(0);
  const tgX = useRef(0);
  const tgY = useRef(0);

  useEffect(() => {
    document.body.style.setProperty("--gradient-background-start", gradientBackgroundStart);
    document.body.style.setProperty("--gradient-background-end", gradientBackgroundEnd);
    document.body.style.setProperty("--first-color", firstColor);
    document.body.style.setProperty("--second-color", secondColor);
    document.body.style.setProperty("--third-color", thirdColor);
    document.body.style.setProperty("--fourth-color", fourthColor);
    document.body.style.setProperty("--fifth-color", fifthColor);
    document.body.style.setProperty("--pointer-color", pointerColor);
    document.body.style.setProperty("--size", size);
    document.body.style.setProperty("--blending-value", blendingValue);
  }, [
    gradientBackgroundStart, gradientBackgroundEnd, firstColor, secondColor,
    thirdColor, fourthColor, fifthColor, pointerColor, size, blendingValue,
  ]);

  useEffect(() => {
    if (!interactive) return;

    let animationFrameId: number;

    function move() {
      if (!interactiveRef.current) return;
      curX.current += (tgX.current - curX.current) / 20;
      curY.current += (tgY.current - curY.current) / 20;
      interactiveRef.current.style.transform = `translate(${Math.round(curX.current)}px, ${Math.round(curY.current)}px)`;
      animationFrameId = requestAnimationFrame(move);
    }

    function handleMouseMove(event: MouseEvent) {
      tgX.current = event.clientX;
      tgY.current = event.clientY;
    }

    window.addEventListener("mousemove", handleMouseMove);
    move();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [interactive]);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden bg-[linear-gradient(40deg,var(--gradient-background-start),var(--gradient-background-end))]",
        className
      )}
    >
      <svg className="hidden">
        <defs>
          <filter id="blurMe">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
      <div
        className="gradients-container absolute inset-0 h-full w-full"
        style={{ filter: "url(#blurMe) blur(40px)" }}
      >
        {[
          { color: firstColor, delay: "0s", dur: "12s" },
          { color: secondColor, delay: "2s", dur: "14s" },
          { color: thirdColor, delay: "4s", dur: "16s" },
          { color: fourthColor, delay: "1s", dur: "18s" },
          { color: fifthColor, delay: "3s", dur: "20s" },
        ].map(({ color, delay, dur }, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-100"
            style={{
              left: "calc(50% - var(--size) / 2)",
              top: "calc(50% - var(--size) / 2)",
              width: "var(--size)",
              height: "var(--size)",
              background: `radial-gradient(circle at center, rgba(${color}, 0.8) 0, rgba(${color}, 0) 50%) no-repeat`,
              mixBlendMode: blendingValue as React.CSSProperties["mixBlendMode"],
              animation: `moveInCircle ${dur} ease infinite`,
              animationDelay: delay,
            }}
          />
        ))}
        {interactive && (
          <div
            ref={interactiveRef}
            className="absolute -left-1/2 -top-1/2 h-full w-full rounded-full opacity-70"
            style={{
              background: `radial-gradient(circle at center, rgba(${pointerColor}, 0.8) 0, rgba(${pointerColor}, 0) 50%) no-repeat`,
              mixBlendMode: blendingValue as React.CSSProperties["mixBlendMode"],
            }}
          />
        )}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
