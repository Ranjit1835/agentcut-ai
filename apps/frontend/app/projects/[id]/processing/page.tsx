"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Brain, Scissors, Type,
  Image, Shield, Film, Check,
  Loader2, AlertCircle, Zap,
} from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { RetroGrid } from "@/components/magic/retro-grid";
import { NumberTicker } from "@/components/magic/number-ticker";
import { Sparkles } from "@/components/magic/sparkles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAgentProgress, type AgentStatus as WsAgentStatus } from "@/hooks/use-agent-progress";
import { cn } from "@/lib/utils";

type AgentDisplayStatus = "pending" | "running" | "completed" | "failed";

interface AgentNode {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
}

const AGENT_META: AgentNode[] = [
  { id: "ingest", name: "Ingest", icon: Upload, description: "Download & extract" },
  { id: "transcript", name: "Transcript", icon: Brain, description: "Speech-to-text" },
  { id: "story", name: "Story", icon: Zap, description: "Find viral moments" },
  { id: "cut", name: "Cut", icon: Scissors, description: "Clean timeline" },
  { id: "broll", name: "B-Roll", icon: Image, description: "Visual suggestions" },
  { id: "caption", name: "Caption", icon: Type, description: "Styled captions" },
  { id: "effects", name: "Effects", icon: Zap, description: "Zoom & transitions" },
  { id: "quality", name: "Quality", icon: Shield, description: "Score & approve" },
  { id: "render", name: "Render", icon: Film, description: "9:16 export" },
];

const statusStyles: Record<AgentDisplayStatus, { bg: string; border: string; icon: React.ReactNode }> = {
  pending: {
    bg: "bg-white/5",
    border: "border-white/10",
    icon: <div className="h-2 w-2 rounded-full bg-white/30" />,
  },
  running: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/50 shadow-lg shadow-violet-500/20",
    icon: <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />,
  },
  completed: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/30",
    icon: <Check className="h-4 w-4 text-emerald-400" />,
  },
  failed: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: <AlertCircle className="h-4 w-4 text-red-400" />,
  },
};

// --- Animated Beam Between Nodes ---
interface BeamPathProps {
  fromRef: React.RefObject<HTMLElement>;
  toRef: React.RefObject<HTMLElement>;
  containerRef: React.RefObject<HTMLElement>;
  status: "pending" | "active" | "completed";
  index: number;
}

function BeamPath({ fromRef, toRef, containerRef, status, index }: BeamPathProps) {
  const [path, setPath] = useState<string>("");
  const [fromPos, setFromPos] = useState({ x: 0, y: 0 });
  const [toPos, setToPos] = useState({ x: 0, y: 0 });

  const updatePath = useCallback(() => {
    if (!fromRef.current || !toRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const fromRect = fromRef.current.getBoundingClientRect();
    const toRect = toRef.current.getBoundingClientRect();

    const startX = fromRect.left + fromRect.width / 2 - containerRect.left;
    const startY = fromRect.top + fromRect.height / 2 - containerRect.top;
    const endX = toRect.left + toRect.width / 2 - containerRect.left;
    const endY = toRect.top + toRect.height / 2 - containerRect.top;

    setFromPos({ x: startX, y: startY });
    setToPos({ x: endX, y: endY });

    // Create a curved path between nodes
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const curvature = Math.abs(endY - startY) > 20 ? 40 : 20;
    const controlY = midY - curvature;

    setPath(`M ${startX} ${startY} Q ${midX} ${controlY} ${endX} ${endY}`);
  }, [fromRef, toRef, containerRef]);

  useEffect(() => {
    updatePath();
    const observer = new ResizeObserver(updatePath);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener("resize", updatePath);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePath);
    };
  }, [updatePath, containerRef]);

  if (!path) return null;

  const gradientId = `beam-gradient-${index}`;
  const glowId = `beam-glow-${index}`;
  const particleId = `beam-particle-${index}`;

  const isActive = status === "active";
  const isCompleted = status === "completed";
  const opacity = status === "pending" ? 0.15 : isActive ? 1 : 0.6;

  return (
    <g style={{ opacity }}>
      {/* Gradient definition */}
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background line (dim) */}
      <path
        d={path}
        fill="none"
        stroke="rgba(139, 92, 246, 0.1)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Animated beam path */}
      {(isActive || isCompleted) && (
        <motion.path
          d={path}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={isActive ? "3" : "2"}
          strokeLinecap="round"
          filter={isActive ? `url(#${glowId})` : undefined}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: index * 0.1, ease: "easeOut" }}
        />
      )}

      {/* Traveling particle along active beam */}
      {isActive && (
        <>
          <circle r="4" fill="#8B5CF6" filter={`url(#${glowId})`}>
            <animateMotion dur="2s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r="2" fill="#06B6D4">
            <animateMotion dur="2s" repeatCount="indefinite" path={path} begin="0.3s" />
          </circle>
          <circle r="3" fill="white" opacity="0.6">
            <animateMotion dur="2s" repeatCount="indefinite" path={path} begin="0.6s" />
          </circle>
        </>
      )}

      {/* Completed pulse */}
      {isCompleted && (
        <circle r="3" fill="#10B981" opacity="0.8">
          <animateMotion dur="3s" repeatCount="indefinite" path={path} />
        </circle>
      )}
    </g>
  );
}

// --- Main Page ---
export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { agents: wsAgents, isConnected, pipelineStatus } = useAgentProgress(projectId);
  const [selectedAgent, setSelectedAgent] = useState<string | null>("ingest");
  const [estimatedTime, setEstimatedTime] = useState(180);

  // Refs for beam connections
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLButtonElement | null)[]>(Array(9).fill(null));

  const setNodeRef = useCallback((index: number) => (el: HTMLButtonElement | null) => {
    nodeRefs.current[index] = el;
  }, []);

  // Countdown timer
  useEffect(() => {
    if (pipelineStatus !== "running") return;
    const timer = setInterval(() => {
      setEstimatedTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [pipelineStatus]);

  // Redirect to editor when pipeline completes
  useEffect(() => {
    if (pipelineStatus === "completed") {
      const timeout = setTimeout(() => {
        router.push(`/projects/${projectId}/editor`);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [pipelineStatus, projectId, router]);

  // Merge WebSocket agent data with display metadata
  const mergedAgents = AGENT_META.map((meta) => {
    const ws = wsAgents.find((a) => a.name === meta.id);
    return {
      ...meta,
      status: (ws?.status ?? "pending") as AgentDisplayStatus,
      confidence: ws?.confidence ?? null,
      summary: ws?.summary ?? null,
      progressPercent: ws?.progressPercent ?? 0,
    };
  });

  const completedCount = mergedAgents.filter((a) => a.status === "completed").length;
  const progressPercent = (completedCount / mergedAgents.length) * 100;
  const selected = mergedAgents.find((a) => a.id === selectedAgent);

  // Determine beam status between nodes
  const getBeamStatus = (fromIndex: number, toIndex: number): "pending" | "active" | "completed" => {
    const fromAgent = mergedAgents[fromIndex];
    const toAgent = mergedAgents[toIndex];
    if (!fromAgent || !toAgent) return "pending";
    if (fromAgent.status === "completed" && toAgent.status === "completed") return "completed";
    if (fromAgent.status === "completed" && toAgent.status === "running") return "active";
    if (fromAgent.status === "running") return "active";
    return "pending";
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      <RetroGrid className="opacity-30" />
      <Navbar />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 px-4 py-1.5">
            {pipelineStatus === "completed" ? (
              <>
                <Check className="mr-1.5 h-3 w-3" />
                Complete — Redirecting to editor...
              </>
            ) : pipelineStatus === "failed" ? (
              <>
                <AlertCircle className="mr-1.5 h-3 w-3" />
                Processing failed
              </>
            ) : (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Processing — {completedCount}/{mergedAgents.length} agents complete
              </>
            )}
          </Badge>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-cyan-400 to-violet-400 bg-clip-text text-transparent">
            Your AI Agents Are Working
          </h1>

          {pipelineStatus === "running" && (
            <p className="mt-2 text-white/50">
              Estimated time remaining:{" "}
              <span className="text-white font-mono">
                <NumberTicker value={Math.floor(estimatedTime / 60)} />:
                {String(estimatedTime % 60).padStart(2, "0")}
              </span>
            </p>
          )}

          {!isConnected && pipelineStatus === "running" && (
            <p className="mt-2 text-amber-400 text-xs">
              Reconnecting to live updates...
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-6 mx-auto max-w-md">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Agent Pipeline with Animated Beams */}
        <div
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="relative mb-8"
        >
          {/* SVG Overlay for beam connections */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ overflow: "visible" }}
          >
            {mergedAgents.slice(0, -1).map((_, i) => (
              <BeamPath
                key={`beam-${i}`}
                fromRef={{ current: nodeRefs.current[i] } as React.RefObject<HTMLElement>}
                toRef={{ current: nodeRefs.current[i + 1] } as React.RefObject<HTMLElement>}
                containerRef={containerRef as React.RefObject<HTMLElement>}
                status={getBeamStatus(i, i + 1)}
                index={i}
              />
            ))}
          </svg>

          {/* Agent Node Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 relative z-20">
            {mergedAgents.map((agent, i) => {
              const style = statusStyles[agent.status];
              const isRunning = agent.status === "running";

              const cardContent = (
                <motion.button
                  key={agent.id}
                  ref={setNodeRef(i)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={cn(
                    "relative rounded-xl border p-4 text-left transition-all duration-300 backdrop-blur-sm",
                    style.bg,
                    style.border,
                    selectedAgent === agent.id && "ring-2 ring-violet-500/50 scale-[1.02]",
                    isRunning && "animate-pulse-subtle"
                  )}
                >
                  {/* Active agent glow ring */}
                  {isRunning && (
                    <motion.div
                      className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-violet-500/30 via-cyan-500/30 to-violet-500/30"
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ zIndex: -1 }}
                    />
                  )}

                  {/* Completed checkmark ring */}
                  {agent.status === "completed" && (
                    <motion.div
                      className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ zIndex: -1 }}
                    />
                  )}

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                        isRunning
                          ? "bg-violet-500/20 shadow-lg shadow-violet-500/20"
                          : agent.status === "completed"
                          ? "bg-emerald-500/10"
                          : "bg-white/5"
                      )}>
                        <agent.icon className={cn(
                          "h-4 w-4",
                          isRunning ? "text-violet-300" :
                          agent.status === "completed" ? "text-emerald-400" :
                          "text-white/60"
                        )} />
                      </div>
                      {style.icon}
                    </div>
                    <p className={cn(
                      "text-sm font-medium",
                      isRunning && "text-violet-200"
                    )}>
                      {agent.name}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">{agent.description}</p>
                    {agent.confidence !== null && (
                      <p className="text-xs text-violet-400 mt-1 font-mono">
                        {(agent.confidence * 100).toFixed(0)}% confidence
                      </p>
                    )}

                    {/* Progress indicator for running agent */}
                    {isRunning && agent.progressPercent > 0 && (
                      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${agent.progressPercent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                </motion.button>
              );

              // Wrap running agent in Sparkles for extra visual flair
              if (isRunning) {
                return (
                  <Sparkles key={agent.id} className="w-full" count={6} size={12}>
                    {cardContent}
                  </Sparkles>
                );
              }

              return cardContent;
            })}
          </div>
        </div>

        {/* Agent Detail Panel */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="border-violet-500/20 backdrop-blur-sm bg-black/40">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl",
                      selected.status === "running"
                        ? "bg-violet-500/20 shadow-lg shadow-violet-500/20"
                        : "bg-violet-500/10"
                    )}>
                      <selected.icon className={cn(
                        "h-5 w-5",
                        selected.status === "running" ? "text-violet-300" : "text-violet-400"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold">Agent: {selected.name}</h3>
                      <p className="text-xs text-white/40">
                        Status: {selected.status}
                        {selected.confidence !== null
                          ? ` — ${(selected.confidence * 100).toFixed(0)}% confidence`
                          : ""}
                      </p>
                    </div>
                    <Badge
                      variant={
                        selected.status === "completed"
                          ? "success"
                          : selected.status === "running"
                          ? "default"
                          : selected.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                      className="ml-auto"
                    >
                      {selected.status}
                    </Badge>
                  </div>

                  <div className="rounded-lg bg-black/50 border border-white/5 p-4 font-mono text-sm text-white/70">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-3 w-3 text-violet-400" />
                      <span className="text-xs text-violet-400">Agent Output</span>
                    </div>
                    <p>{selected.summary ?? "Waiting to start..."}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Global CSS for subtle pulse animation */}
      <style jsx global>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
