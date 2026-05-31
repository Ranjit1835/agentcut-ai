"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Brain, Scissors, Type, Sparkles,
  Image, Shield, Film, MessageSquare, Check,
  Loader2, AlertCircle, ChevronRight, Zap,
} from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { RetroGrid } from "@/components/magic/retro-grid";
import { NumberTicker } from "@/components/magic/number-ticker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AgentStatus = "pending" | "running" | "complete" | "failed";

interface AgentNode {
  id: string;
  name: string;
  icon: React.ElementType;
  status: AgentStatus;
  description: string;
  detail: string;
  confidence: number | null;
}

const initialAgents: AgentNode[] = [
  { id: "ingest", name: "Ingest", icon: Upload, status: "complete", description: "Download & extract", detail: "Source video downloaded, audio extracted, thumbnail generated", confidence: 0.95 },
  { id: "transcript", name: "Transcript", icon: Brain, status: "complete", description: "Speech-to-text", detail: "3,847 words transcribed with word-level timestamps", confidence: 0.92 },
  { id: "story", name: "Story", icon: Sparkles, status: "running", description: "Find viral moments", detail: "Analyzing emotional peaks and hook opportunities...", confidence: null },
  { id: "cut", name: "Cut", icon: Scissors, status: "pending", description: "Clean timeline", detail: "Waiting for story analysis", confidence: null },
  { id: "caption", name: "Caption", icon: Type, status: "pending", description: "Styled captions", detail: "Will generate word-by-word reveal captions", confidence: null },
  { id: "effects", name: "Effects", icon: Sparkles, status: "pending", description: "Zoom & transitions", detail: "Face detection and punch-in effects", confidence: null },
  { id: "broll", name: "B-Roll", icon: Image, status: "pending", description: "Visual suggestions", detail: "Will search Pexels for contextual footage", confidence: null },
  { id: "quality", name: "Quality", icon: Shield, status: "pending", description: "Score & approve", detail: "Retention prediction and quality gate", confidence: null },
  { id: "render", name: "Render", icon: Film, status: "pending", description: "9:16 export", detail: "FFmpeg rendering with ASS subtitles", confidence: null },
  { id: "feedback", name: "Feedback", icon: MessageSquare, status: "pending", description: "Re-edit", detail: "Ready for your natural language feedback", confidence: null },
];

const statusStyles: Record<AgentStatus, { bg: string; border: string; icon: React.ReactNode }> = {
  pending: {
    bg: "bg-white/5",
    border: "border-white/10",
    icon: <div className="h-2 w-2 rounded-full bg-white/30" />,
  },
  running: {
    bg: "bg-violet-500/10",
    border: "border-violet-500/50 shadow-lg shadow-violet-500/10",
    icon: <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />,
  },
  complete: {
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

export default function ProcessingPage() {
  const [agents, setAgents] = useState(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<string | null>("story");
  const [estimatedTime, setEstimatedTime] = useState(180);

  // Simulate processing progress
  useEffect(() => {
    const timer = setInterval(() => {
      setEstimatedTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const completedCount = agents.filter((a) => a.status === "complete").length;
  const progressPercent = (completedCount / agents.length) * 100;

  const selected = agents.find((a) => a.id === selectedAgent);

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      <RetroGrid className="opacity-30" />
      <Navbar />

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 px-4 py-1.5">
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            Processing — {completedCount}/{agents.length} agents complete
          </Badge>
          <h1 className="text-3xl font-bold">Your AI Agents Are Working</h1>
          <p className="mt-2 text-white/50">
            Estimated time remaining:{" "}
            <span className="text-white font-mono">
              <NumberTicker value={Math.floor(estimatedTime / 60)} />:
              {String(estimatedTime % 60).padStart(2, "0")}
            </span>
          </p>

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

        {/* Agent Pipeline Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {agents.map((agent, i) => {
            const style = statusStyles[agent.status];
            return (
              <motion.button
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedAgent(agent.id)}
                className={`relative rounded-xl border p-4 text-left transition-all duration-300 ${style.bg} ${style.border} ${
                  selectedAgent === agent.id ? "ring-2 ring-violet-500/50" : ""
                }`}
              >
                {/* Active agent pulse */}
                {agent.status === "running" && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-violet-500/10"
                    animate={{ opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                      <agent.icon className="h-4 w-4 text-white/60" />
                    </div>
                    {style.icon}
                  </div>
                  <p className="text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{agent.description}</p>
                  {agent.confidence && (
                    <p className="text-xs text-violet-400 mt-1 font-mono">
                      {(agent.confidence * 100).toFixed(0)}% confidence
                    </p>
                  )}
                </div>

                {/* Connector line (between agents) */}
                {i < agents.length - 1 && i % 5 !== 4 && (
                  <div className="absolute -right-2 top-1/2 z-20 hidden lg:block">
                    <ChevronRight className="h-3 w-3 text-white/20" />
                  </div>
                )}
              </motion.button>
            );
          })}
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
              <Card className="border-violet-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                      <selected.icon className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Agent: {selected.name}</h3>
                      <p className="text-xs text-white/40">
                        Status: {selected.status} {selected.confidence ? `— ${(selected.confidence * 100).toFixed(0)}% confidence` : ""}
                      </p>
                    </div>
                    <Badge
                      variant={selected.status === "complete" ? "success" : selected.status === "running" ? "default" : "secondary"}
                      className="ml-auto"
                    >
                      {selected.status}
                    </Badge>
                  </div>

                  <div className="rounded-lg bg-black/30 p-4 font-mono text-sm text-white/70">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-3 w-3 text-violet-400" />
                      <span className="text-xs text-violet-400">Agent Output</span>
                    </div>
                    <p>{selected.detail}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
