"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, MessageSquare, RefreshCw, Play, Pause,
  Zap, ThumbsUp, Eye, Clock, Send, Sparkles,
} from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { BorderBeam } from "@/components/magic/border-beam";
import { NumberTicker } from "@/components/magic/number-ticker";
import { Particles } from "@/components/magic/particles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Clip {
  id: string;
  title: string;
  duration: string;
  viralityScore: number;
  hookText: string;
  qualityScores: {
    hook: number;
    pacing: number;
    retention: number;
    overall: number;
  };
  retentionCurve: number[];
  status: "complete" | "rendering" | "failed";
}

const mockClips: Clip[] = [
  {
    id: "1",
    title: "The $10M Mindset Shift",
    duration: "0:45",
    viralityScore: 92,
    hookText: "Nobody tells you this about building a startup...",
    qualityScores: { hook: 95, pacing: 88, retention: 90, overall: 92 },
    retentionCurve: [100, 96, 92, 88, 85, 83, 81, 80, 79, 78],
    status: "complete",
  },
  {
    id: "2",
    title: "Why Most Founders Fail",
    duration: "0:38",
    viralityScore: 85,
    hookText: "I lost $2 million before I learned this lesson",
    qualityScores: { hook: 90, pacing: 82, retention: 84, overall: 85 },
    retentionCurve: [100, 94, 88, 84, 80, 78, 76, 75, 74, 73],
    status: "complete",
  },
  {
    id: "3",
    title: "The Hiring Secret",
    duration: "0:52",
    viralityScore: 78,
    hookText: "Stop hiring for skills. Here's what actually matters.",
    qualityScores: { hook: 82, pacing: 76, retention: 78, overall: 78 },
    retentionCurve: [100, 92, 85, 80, 76, 73, 70, 68, 66, 65],
    status: "complete",
  },
];

const quickChips = ["Faster cuts", "Bigger captions", "More zooms", "Different style", "Shorter clips"];

export default function EditorPage() {
  const [selectedClip, setSelectedClip] = useState<Clip>(mockClips[0]);
  const [feedback, setFeedback] = useState("");
  const [feedbackResponse, setFeedbackResponse] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFeedback = async () => {
    if (!feedback.trim()) return;
    setIsProcessing(true);
    setFeedbackResponse(null);

    // Simulate AI response with streaming effect
    await new Promise((r) => setTimeout(r, 1500));
    setFeedbackResponse(
      `Got it! I'll "${feedback}". Re-running the Caption and Render agents now. Your updated clips will be ready in ~30 seconds.`
    );
    setIsProcessing(false);
    setFeedback("");
  };

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      <Particles className="opacity-15" quantity={20} />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Editor</h1>
            <p className="text-white/50 text-sm">
              {mockClips.length} clips generated &middot; Click to preview and download
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Download All
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Clips Grid + Preview */}
          <div className="space-y-6">
            {/* Clip Thumbnails */}
            <div className="grid gap-3 sm:grid-cols-3">
              {mockClips.map((clip, i) => (
                <motion.button
                  key={clip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedClip(clip)}
                  className="text-left"
                >
                  <Card
                    className={`relative transition-all duration-300 ${
                      selectedClip.id === clip.id
                        ? "border-violet-500 ring-2 ring-violet-500/20"
                        : "hover:border-white/20"
                    }`}
                  >
                    {selectedClip.id === clip.id && <BorderBeam size={80} />}
                    <CardContent className="p-4">
                      <div className="aspect-[9/16] rounded-lg bg-gradient-to-br from-violet-500/10 to-cyan-500/10 flex items-center justify-center mb-3">
                        <Play className="h-8 w-8 text-white/20" />
                      </div>
                      <p className="text-sm font-medium truncate">{clip.title}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-white/40">{clip.duration}</span>
                        <Badge
                          variant={clip.viralityScore >= 85 ? "success" : "default"}
                          className="text-[10px]"
                        >
                          {clip.viralityScore}/100
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.button>
              ))}
            </div>

            {/* Quality Scores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-400" />
                  Quality Analysis — {selectedClip.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Hook", value: selectedClip.qualityScores.hook, icon: ThumbsUp },
                    { label: "Pacing", value: selectedClip.qualityScores.pacing, icon: Clock },
                    { label: "Retention", value: selectedClip.qualityScores.retention, icon: Eye },
                    { label: "Overall", value: selectedClip.qualityScores.overall, icon: Zap },
                  ].map((score) => (
                    <div key={score.label} className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <score.icon className="h-3.5 w-3.5 text-white/40" />
                        <span className="text-xs text-white/40">{score.label}</span>
                      </div>
                      <p className={`text-2xl font-bold ${
                        score.value >= 85 ? "text-emerald-400" :
                        score.value >= 70 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        <NumberTicker value={score.value} />
                      </p>
                    </div>
                  ))}
                </div>

                {/* Retention Curve */}
                <div>
                  <p className="text-xs text-white/40 mb-2">Predicted Retention Curve</p>
                  <div className="flex items-end gap-1 h-16">
                    {selectedClip.retentionCurve.map((val, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${val}%` }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                        className="flex-1 rounded-t bg-gradient-to-t from-violet-500/40 to-cyan-500/40"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-white/30">0%</span>
                    <span className="text-[10px] text-white/30">100%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Feedback Panel (THE DIFFERENTIATOR) */}
          <div className="space-y-4">
            <Card className="border-violet-500/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-violet-400" />
                  Conversational Re-Editing
                  <Badge variant="default" className="ml-auto text-[10px]">
                    <Sparkles className="mr-1 h-2.5 w-2.5" /> AI Agent 10
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-white/40">
                  Tell the AI what you want changed in plain English. It will determine which agents
                  need to re-run and apply your changes automatically.
                </p>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-2">
                  {quickChips.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setFeedback(chip)}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60 hover:border-violet-500/30 hover:text-violet-400 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="What would you like to change?"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFeedback()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleFeedback}
                    disabled={!feedback.trim() || isProcessing}
                    size="icon"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* AI Response */}
                <AnimatePresence>
                  {feedbackResponse && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="h-3 w-3 text-violet-400" />
                        <span className="text-xs font-medium text-violet-400">Agent Response</span>
                      </div>
                      <p className="text-sm text-white/70">{feedbackResponse}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Re-render button */}
                <ShimmerButton className="w-full h-10 text-sm" onClick={handleFeedback}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Re-render with Changes
                </ShimmerButton>
              </CardContent>
            </Card>

            {/* Download per clip */}
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Download: {selectedClip.title}</h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-between text-sm" size="sm">
                    <span>1080p MP4</span>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-between text-sm" size="sm">
                    <span>720p MP4</span>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Hook Text */}
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-white/40 mb-1">Hook Text</p>
                <p className="text-sm text-white/80 italic">&ldquo;{selectedClip.hookText}&rdquo;</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
