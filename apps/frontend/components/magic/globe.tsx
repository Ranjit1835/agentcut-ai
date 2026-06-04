"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface GlobeConfig {
  dotColor?: string;
  arcColor?: string;
  lineColor?: string;
  speed?: number;
  dotCount?: number;
  dotSize?: number;
}

interface GlobeProps {
  className?: string;
  config?: GlobeConfig;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Arc {
  start: Point3D;
  end: Point3D;
  progress: number;
  speed: number;
}

// City coordinates as [lat, lon] for arc endpoints
const CITIES: [number, number][] = [
  [40.7128, -74.006],   // New York
  [51.5074, -0.1278],   // London
  [35.6762, 139.6503],  // Tokyo
  [28.6139, 77.209],    // Delhi
  [-33.8688, 151.2093], // Sydney
  [48.8566, 2.3522],    // Paris
  [37.7749, -122.4194], // San Francisco
  [1.3521, 103.8198],   // Singapore
  [-23.5505, -46.6333], // São Paulo
  [55.7558, 37.6173],   // Moscow
];

function latLonToPoint(lat: number, lon: number, radius: number): Point3D {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

function rotateY(point: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  };
}

export function Globe({ className, config = {} }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotationRef = useRef(0);

  const {
    dotColor = "#8B5CF6",
    arcColor = "#06B6D4",
    lineColor = "rgba(139, 92, 246, 0.1)",
    speed = 0.002,
    dotCount = 600,
    dotSize = 1.2,
  } = config;

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) * 0.75;

      ctx.clearRect(0, 0, width, height);
      rotationRef.current += speed;
      const rotation = rotationRef.current;

      // Draw wireframe meridians/parallels
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.5;

      // Parallels
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lon = 0; lon <= 360; lon += 3) {
          const p = latLonToPoint(lat, lon, radius);
          const rp = rotateY(p, rotation);
          if (rp.z < 0) continue;
          const sx = cx + rp.x;
          const sy = cy - rp.y;
          if (lon === 0 || rp.z < 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }

      // Meridians
      for (let lon = 0; lon < 360; lon += 30) {
        ctx.beginPath();
        let moved = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = latLonToPoint(lat, lon, radius);
          const rp = rotateY(p, rotation);
          if (rp.z < 0) {
            moved = false;
            continue;
          }
          const sx = cx + rp.x;
          const sy = cy - rp.y;
          if (!moved) {
            ctx.moveTo(sx, sy);
            moved = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.stroke();
      }

      // Fibonacci sphere dots
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < dotCount; i++) {
        const y = 1 - (i / (dotCount - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        const point: Point3D = {
          x: r * Math.cos(theta) * radius,
          y: y * radius,
          z: r * Math.sin(theta) * radius,
        };
        const rp = rotateY(point, rotation);
        if (rp.z < 0) continue;

        const depth = (rp.z + radius) / (2 * radius);
        const alpha = 0.15 + depth * 0.65;
        const sz = dotSize * (0.5 + depth * 0.5);

        ctx.beginPath();
        ctx.arc(cx + rp.x, cy - rp.y, sz, 0, Math.PI * 2);
        ctx.fillStyle =
          dotColor +
          Math.round(alpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();
      }

      // Arcs between cities
      const arcPairs = [
        [0, 1], [1, 3], [2, 7], [3, 7], [0, 6],
        [4, 2], [5, 9], [8, 0], [6, 2], [1, 5],
      ];

      for (const [si, ei] of arcPairs) {
        const startCity = CITIES[si!]!;
        const endCity = CITIES[ei!]!;

        const startP = latLonToPoint(startCity[0], startCity[1], radius);
        const endP = latLonToPoint(endCity[0], endCity[1], radius);

        const segments = 40;
        ctx.beginPath();
        let hasVisible = false;

        for (let t = 0; t <= segments; t++) {
          const frac = t / segments;
          // Interpolate along great circle (simplified: lerp + lift)
          const lift = 1 + 0.15 * Math.sin(frac * Math.PI);
          const mp: Point3D = {
            x: (startP.x * (1 - frac) + endP.x * frac) * lift,
            y: (startP.y * (1 - frac) + endP.y * frac) * lift,
            z: (startP.z * (1 - frac) + endP.z * frac) * lift,
          };
          const rp = rotateY(mp, rotation);
          if (rp.z < -radius * 0.1) {
            hasVisible = false;
            continue;
          }

          const sx = cx + rp.x;
          const sy = cy - rp.y;
          if (!hasVisible) {
            ctx.moveTo(sx, sy);
            hasVisible = true;
          } else {
            ctx.lineTo(sx, sy);
          }
        }

        const depth =
          (rotateY(
            {
              x: (startP.x + endP.x) / 2,
              y: (startP.y + endP.y) / 2,
              z: (startP.z + endP.z) / 2,
            },
            rotation
          ).z +
            radius) /
          (2 * radius);
        const arcAlpha = Math.max(0, Math.min(1, depth * 0.8));

        ctx.strokeStyle =
          arcColor +
          Math.round(arcAlpha * 255)
            .toString(16)
            .padStart(2, "0");
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Glow on city points
      for (const [lat, lon] of CITIES) {
        const p = latLonToPoint(lat, lon, radius);
        const rp = rotateY(p, rotation);
        if (rp.z < 0) continue;

        const depth = (rp.z + radius) / (2 * radius);
        ctx.beginPath();
        ctx.arc(cx + rp.x, cy - rp.y, 3, 0, Math.PI * 2);
        ctx.fillStyle =
          arcColor +
          Math.round(depth * 200)
            .toString(16)
            .padStart(2, "0");
        ctx.fill();

        // Glow
        const gradient = ctx.createRadialGradient(
          cx + rp.x, cy - rp.y, 0,
          cx + rp.x, cy - rp.y, 8
        );
        gradient.addColorStop(0, arcColor + "40");
        gradient.addColorStop(1, arcColor + "00");
        ctx.beginPath();
        ctx.arc(cx + rp.x, cy - rp.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(() =>
        draw(ctx, width, height)
      );
    },
    [dotColor, arcColor, lineColor, speed, dotCount, dotSize]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    draw(ctx, rect.width, rect.height);

    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("h-[400px] w-[400px]", className)}
    />
  );
}
