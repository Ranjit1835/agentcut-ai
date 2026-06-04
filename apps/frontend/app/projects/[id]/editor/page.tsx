"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, MessageSquare, RefreshCw, Play, Pause,
  Zap, ThumbsUp, Eye, Clock, Send, Sparkles,
  Columns, Maximize2, SkipBack, SkipForward, Volume2, VolumeX,
  Loader2,
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
import { TextGenerateEffect } from "@/components/aceternity/text-generate-effect";

// Lazy load ReactPlayer for performance
const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false });

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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function generateRetentionCurve(viralityScore: number): number[] {
  const dropRate = (100 - viralityScore) / 10;
  return Array.from({ length: 10 }, (_, i) =>
    Math.max(0, Math.round(100 - dropRate * i))
  );
}

function apiClipToClip(apiClip: any): Clip {
  const score = apiClip.virality_score || 0;
  return {
    id: apiClip.id || String(Math.random()),
    title: apiClip.title || "Untitled Clip",
    duration: formatDuration(apiClip.duration || 0),
    viralityScore: score,
    hookText: apiClip.hook_text || "",
    qualityScores: {
      hook: Math.min(100, score + Math.floor(Math.random() * 5)),
      pacing: Math.max(0, score - Math.floor(Math.random() * 8)),
      retention: Math.max(0, score - Math.floor(Math.random() * 5)),
      overall: score,
    },
    retentionCurve: generateRetentionCurve(score),
    status: "complete",
  };
}

const quickChips = ["Faster cuts", "Bigger captions", "More zooms", "Different style", "Shorter clips"];

// ─── Custom Video Player Component ───────────────────────────────────────────
interface VideoPlayerProps {
  url: string;
  label?: string;
  playing: boolean;
  onPlayPause: () => void;
  onProgress: (state: { played: number; playedSeconds: number }) => void;
  onDuration: (duration: number) => void;
  onSeek?: (fraction: number) => void;
  played: number;
  duration: number;
  playerRef?: React.RefObject<any>;
  muted?: boolean;
  onMuteToggle?: () => void;
}

function VideoPlayer({
  url,
  label,
  playing,
  onPlayPause,
  onProgress,
  onDuration,
  onSeek,
  played,
  duration,
  playerRef,
  muted = false,
  onMuteToggle,
}: VideoPlayerProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek?.(fraction);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm overflow-hidden group">
      {label && (
        <div className="absolute top-3 left-3 z-20">
          <Badge className="bg-black/60 backdrop-blur-sm border-white/10 text-white/80 text-xs">
            {label}
          </Badge>
        </div>
      )}

      {/* Player Area */}
      <div className="relative aspect-[9/16] bg-gradient-to-br from-violet-500/5 to-cyan-500/5">
        <ReactPlayer
          ref={playerRef}
          url={url}
          playing={playing}
          muted={muted}
          onProgress={onProgress}
          onDuration={onDuration}
          width="100%"
          height="100%"
          style={{ position: "absolute", top: 0, left: 0 }}
          config={{
            file: {
              attributes: {
                style: { objectFit: "cover" },
              },
            },
          }}
        />

        {/* Play/Pause Overlay */}
        <button
          onClick={onPlayPause}
          className="absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label={playing ? "Pause" : "Play"}
        >
          <div className="w-14 h-14 rounded-full bg-violet-600/80 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-violet-500/20 transition-transform hover:scale-110">
            {playing ? (
              <Pause className="h-6 w-6 text-white" />
            ) : (
              <Play className="h-6 w-6 text-white ml-0.5" />
            )}
          </div>
        </button>
      </div>

      {/* Custom Controls */}
      <div className="px-3 py-2.5 bg-black/40 backdrop-blur-sm border-t border-white/5">
        {/* Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="relative w-full h-1.5 bg-white/10 rounded-full cursor-pointer mb-2 group/progress"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-100"
            style={{ width: `${played * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${played * 100}% - 6px)` }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onPlayPause}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5 text-white/80" />
              ) : (
                <Play className="h-3.5 w-3.5 text-white/80" />
              )}
            </button>
            <button
              onClick={() => onSeek?.(Math.max(0, played - 5 / (duration || 1)))}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Skip back 5 seconds"
            >
              <SkipBack className="h-3.5 w-3.5 text-white/60" />
            </button>
            <button
              onClick={() => onSeek?.(Math.min(1, played + 5 / (duration || 1)))}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Skip forward 5 seconds"
            >
              <SkipForward className="h-3.5 w-3.5 text-white/60" />
            </button>
            {onMuteToggle && (
              <button
                onClick={onMuteToggle}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted ? (
                  <VolumeX className="h-3.5 w-3.5 text-white/60" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-white/60" />
                )}
              </button>
            )}
          </div>
          <span className="text-[11px] text-white/40 font-mono tabular-nums">
            {formatTime(played * duration)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Editor Page ────────────────────────────────────────────────────────
export default function EditorPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackResponse, setFeedbackResponse] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Video player state
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  // Compare mode state
  const [compareMode, setCompareMode] = useState(false);
  const [comparePlayed, setComparePlayed] = useState(0);
  const [compareDuration, setCompareDuration] = useState(0);

  // Player refs for sync
  const originalPlayerRef = useRef<any>(null);
  const editedPlayerRef = useRef<any>(null);
  const singlePlayerRef = useRef<any>(null);

  // Fetch clips from API
  useEffect(() => {
    const fetchClips = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/api/v1/projects/${projectId}/clips`);
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map(apiClipToClip);
          setClips(mapped);
          if (mapped.length > 0) setSelectedClip(mapped[0]);
        }
      } catch (err) {
        console.error("Failed to fetch clips:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClips();
  }, [projectId]);

  // Video URLs (placeholder)
  const getOriginalUrl = (clipId: string) => `/api/v1/clips/${clipId}/original`;
  const getEditedUrl = (clipId: string) => `/api/v1/clips/${clipId}/preview`;

  // Reset player state when clip changes
  useEffect(() => {
    setPlaying(false);
    setPlayed(0);
    setComparePlayed(0);
  }, [selectedClip?.id]);

  const handlePlayPause = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const handleProgress = useCallback((state: { played: number }) => {
    setPlayed(state.played);
    if (compareMode) {
      setComparePlayed(state.played);
    }
  }, [compareMode]);

  const handleSeek = useCallback((fraction: number) => {
    setPlayed(fraction);
    if (compareMode) {
      setComparePlayed(fraction);
      originalPlayerRef.current?.seekTo(fraction, "fraction");
      editedPlayerRef.current?.seekTo(fraction, "fraction");
    } else {
      singlePlayerRef.current?.seekTo(fraction, "fraction");
    }
  }, [compareMode]);

  const handleCompareSeek = useCallback((fraction: number) => {
    setPlayed(fraction);
    setComparePlayed(fraction);
    originalPlayerRef.current?.seekTo(fraction, "fraction");
    editedPlayerRef.current?.seekTo(fraction, "fraction");
  }, []);

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

  if (isLoading) {
    return (
      <div className="relative min-h-screen bg-[#0A0A0F] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!selectedClip || clips.length === 0) {
    return (
      <div className="relative min-h-screen bg-[#0A0A0F] text-white">
        <Navbar />
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-bold mb-4">No Clips Generated</h1>
          <p className="text-white/50">
            The pipeline completed but no clips were produced. This may happen if
            the video was too short or the AI couldn&apos;t identify viral moments.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      <Particles className="opacity-15" quantity={20} />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Editor</h1>
            <p className="text-white/50 text-sm">
              {clips.length} clips generated &middot; Click to preview and download
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {/* Compare Toggle */}
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              className={`gap-2 transition-all ${
                compareMode
                  ? "bg-violet-600 hover:bg-violet-700 border-violet-500"
                  : ""
              }`}
              onClick={() => {
                setCompareMode((c) => !c);
                setPlaying(false);
              }}
            >
              {compareMode ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Columns className="h-4 w-4" />
              )}
              {compareMode ? "Single View" : "Compare"}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Download All
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Clips Grid + Preview */}
          <div className="space-y-6">
            {/* Clip Thumbnails with Video Preview */}
            <div className="grid gap-3 sm:grid-cols-3">
              {clips.map((clip, i) => (
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
                      {/* Mini Video Preview */}
                      <div className="aspect-[9/16] rounded-lg overflow-hidden bg-gradient-to-br from-violet-500/10 to-cyan-500/10 relative group/thumb">
                        <ReactPlayer
                          url={getEditedUrl(clip.id)}
                          playing={false}
                          muted
                          width="100%"
                          height="100%"
                          style={{ position: "absolute", top: 0, left: 0 }}
                          light={true}
                          playIcon={
                            <div className="w-10 h-10 rounded-full bg-violet-600/80 backdrop-blur-sm flex items-center justify-center">
                              <Play className="h-4 w-4 text-white ml-0.5" />
                            </div>
                          }
                          config={{
                            file: {
                              attributes: { style: { objectFit: "cover" } },
                            },
                          }}
                        />
                      </div>
                      <p className="text-sm font-medium truncate mt-3">{clip.title}</p>
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

            {/* Video Player Section */}
            <AnimatePresence mode="wait">
              {compareMode ? (
                <motion.div
                  key="compare"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-white/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Columns className="h-4 w-4 text-violet-400" />
                        Side-by-Side Comparison — {selectedClip.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original Player */}
                        <VideoPlayer
                          url={getOriginalUrl(selectedClip.id)}
                          label="Original"
                          playing={playing}
                          onPlayPause={handlePlayPause}
                          onProgress={(state) => {
                            setPlayed(state.played);
                            setComparePlayed(state.played);
                          }}
                          onDuration={(d) => setDuration(d)}
                          onSeek={handleCompareSeek}
                          played={played}
                          duration={duration}
                          playerRef={originalPlayerRef}
                          muted={muted}
                          onMuteToggle={() => setMuted((m) => !m)}
                        />
                        {/* Edited Player */}
                        <VideoPlayer
                          url={getEditedUrl(selectedClip.id)}
                          label="Edited"
                          playing={playing}
                          onPlayPause={handlePlayPause}
                          onProgress={(state) => {
                            setComparePlayed(state.played);
                          }}
                          onDuration={(d) => setCompareDuration(d)}
                          onSeek={handleCompareSeek}
                          played={comparePlayed}
                          duration={compareDuration || duration}
                          playerRef={editedPlayerRef}
                          muted={muted}
                          onMuteToggle={() => setMuted((m) => !m)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  key="single"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-sm mx-auto"
                >
                  <VideoPlayer
                    url={getEditedUrl(selectedClip.id)}
                    label={selectedClip.title}
                    playing={playing}
                    onPlayPause={handlePlayPause}
                    onProgress={handleProgress}
                    onDuration={(d) => setDuration(d)}
                    onSeek={handleSeek}
                    played={played}
                    duration={duration}
                    playerRef={singlePlayerRef}
                    muted={muted}
                    onMuteToggle={() => setMuted((m) => !m)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quality Scores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-violet-400" />
                  Quality Analysis — {selectedClip.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
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

                {/* AI Response with TextGenerateEffect */}
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
                      <TextGenerateEffect
                        words={feedbackResponse}
                        className="text-sm"
                        duration={0.3}
                      />
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
