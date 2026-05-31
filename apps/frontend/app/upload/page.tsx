"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Link2, Sparkles, Check, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { Particles } from "@/components/magic/particles";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const stylePresets = [
  {
    id: "mrbeast",
    name: "MrBeast",
    desc: "Bold yellow-black, ALL CAPS emphasis, high energy",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    id: "hormozi",
    name: "Hormozi",
    desc: "Clean white box highlight, professional tone",
    gradient: "from-white/80 to-gray-300",
  },
  {
    id: "podcast",
    name: "Podcast",
    desc: "Minimal white text, center-bottom, clean serif",
    gradient: "from-blue-400 to-indigo-500",
  },
  {
    id: "storytelling",
    name: "Storytelling",
    desc: "Elegant serif, subtle animations, warm tone",
    gradient: "from-amber-400 to-rose-400",
  },
  {
    id: "educational",
    name: "Educational",
    desc: "Key term highlights, definitions, clean layout",
    gradient: "from-emerald-400 to-teal-500",
  },
];

export default function UploadPage() {
  const [mode, setMode] = useState<"upload" | "url">("url");
  const [url, setUrl] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("mrbeast");
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setMode("upload");
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      <Particles className="opacity-20" quantity={30} />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold">Create New Project</h1>
          <p className="mt-2 text-white/50">Upload a video or paste a YouTube URL</p>
        </motion.div>

        {/* Upload Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card
            className={`relative transition-all duration-300 ${
              isDragging ? "border-violet-500 bg-violet-500/5" : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center py-8">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20">
                  <Upload className="h-8 w-8 text-violet-400" />
                </div>

                <AnimatePresence>
                  {isDragging && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute inset-0 flex items-center justify-center rounded-xl bg-violet-500/10 backdrop-blur-sm"
                    >
                      <div className="text-center">
                        <Sparkles className="mx-auto h-8 w-8 text-violet-400 mb-2" />
                        <p className="text-lg font-medium">Drop your video here</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-white/60 mb-1">
                  Drag & drop your video here
                </p>
                <p className="text-xs text-white/30 mb-6">
                  MP4, MOV, AVI, WebM — up to 5GB
                </p>

                <div className="flex items-center gap-3 w-full max-w-md">
                  <Button
                    variant={mode === "upload" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("upload")}
                    className="flex-1"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Upload File
                  </Button>
                  <Button
                    variant={mode === "url" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setMode("url")}
                    className="flex-1"
                  >
                    <Link2 className="mr-2 h-4 w-4" /> YouTube URL
                  </Button>
                </div>

                {mode === "url" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6 w-full max-w-md"
                  >
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="h-12"
                    />
                  </motion.div>
                )}

                {mode === "upload" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-6"
                  >
                    <input type="file" accept="video/*" className="hidden" id="video-upload" />
                    <label
                      htmlFor="video-upload"
                      className="cursor-pointer rounded-lg border border-dashed border-white/20 px-8 py-4 text-sm text-white/50 hover:border-violet-500/50 hover:text-violet-400 transition-colors"
                    >
                      Click to browse files
                    </label>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Style Presets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="text-lg font-semibold mb-4">Caption Style</h2>
          <div className="grid gap-3 sm:grid-cols-5">
            {stylePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setSelectedStyle(preset.id)}
                className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                  selectedStyle === preset.id
                    ? "border-violet-500 bg-violet-500/5"
                    : "border-white/10 hover:border-white/20 bg-white/[0.02]"
                }`}
              >
                {selectedStyle === preset.id && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-violet-400" />
                  </div>
                )}
                <div
                  className={`h-8 w-full rounded-md bg-gradient-to-r ${preset.gradient} mb-3 opacity-60`}
                />
                <p className="text-sm font-medium">{preset.name}</p>
                <p className="text-xs text-white/40 mt-1">{preset.desc}</p>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center"
        >
          <ShimmerButton className="h-14 px-12 text-lg">
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Shorts
            <ArrowRight className="ml-2 h-5 w-5" />
          </ShimmerButton>
          <p className="mt-3 text-xs text-white/30">
            This will use ~1 credit per minute of source video
          </p>
        </motion.div>
      </main>
    </div>
  );
}
