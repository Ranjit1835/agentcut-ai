"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Zap, ArrowRight, Check, X, Play, Star,
  Upload, Brain, Scissors, Type, Sparkles,
  Image, Shield, Film, MessageSquare, ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { Footer } from "@/components/premium/footer";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { AnimatedGradientText } from "@/components/magic/animated-gradient-text";
import { NumberTicker } from "@/components/magic/number-ticker";
import { BorderBeam } from "@/components/magic/border-beam";
import { Particles } from "@/components/magic/particles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const agents = [
  { icon: Upload, name: "Ingest", desc: "Download & process any video source" },
  { icon: Brain, name: "Transcript", desc: "Whisper word-level transcription" },
  { icon: Sparkles, name: "Story", desc: "Identify viral hooks & moments" },
  { icon: Scissors, name: "Cut", desc: "Remove silences & filler words" },
  { icon: Type, name: "Caption", desc: "5 style presets, word-by-word reveal" },
  { icon: Sparkles, name: "Effects", desc: "Zoom punch-ins & transitions" },
  { icon: Image, name: "B-Roll", desc: "Contextual visuals from Pexels" },
  { icon: Shield, name: "Quality", desc: "Retention prediction & scoring" },
  { icon: Film, name: "Render", desc: "4K 9:16 with smart face cropping" },
  { icon: MessageSquare, name: "Feedback", desc: "Natural language re-editing" },
];

const stats = [
  { value: 10000, suffix: "+", label: "Videos Generated" },
  { value: 95, suffix: "%", label: "Retention Boost" },
  { value: 10, suffix: "", label: "AI Agents" },
  { value: 5, suffix: "min", label: "Average Processing" },
];

const comparisonFeatures = [
  { feature: "All features on starter plan", agentcut: true, opus: false, submagic: false, veed: false },
  { feature: "API access from $15/mo", agentcut: true, opus: false, submagic: false, veed: false },
  { feature: "No watermark on free tier", agentcut: true, opus: false, submagic: true, veed: false },
  { feature: "Conversational re-editing", agentcut: true, opus: false, submagic: false, veed: false },
  { feature: "Agent transparency", agentcut: true, opus: false, submagic: false, veed: false },
  { feature: "INR pricing", agentcut: true, opus: false, submagic: false, veed: false },
  { feature: "B-Roll suggestions", agentcut: true, opus: true, submagic: false, veed: false },
  { feature: "Word-level captions", agentcut: true, opus: true, submagic: true, veed: true },
  { feature: "4K rendering", agentcut: true, opus: true, submagic: false, veed: true },
];

const testimonials = [
  { name: "Alex Chen", role: "YouTube Creator (2M subs)", quote: "AgentCut replaced my entire editing team. The AI agents produce better shorts than my human editors." },
  { name: "Priya Sharma", role: "Content Strategist", quote: "Finally, a tool with INR pricing that doesn't gate features behind expensive tiers. Game changer for Indian creators." },
  { name: "Marcus Williams", role: "Podcast Host", quote: "The conversational re-editing is magic. I just say 'make cuts faster' and it re-renders instantly." },
  { name: "Sarah Kim", role: "TikTok Creator (500K)", quote: "I switched from Opus Clip. AgentCut gives me 3x more credits and the quality is visibly better." },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      <Particles className="opacity-30" quantity={80} />
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div {...fadeUp}>
            <Badge className="mb-6 px-4 py-1.5">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Powered by 10 AI Agents
            </Badge>
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          >
            From long video to{" "}
            <AnimatedGradientText className="text-4xl font-bold sm:text-6xl lg:text-7xl">
              viral short
            </AnimatedGradientText>
            <br />
            in 5 minutes
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-white/60 max-w-2xl mx-auto"
          >
            Upload any long-form video. AgentCut&apos;s multi-agent AI pipeline identifies
            viral moments, cuts clips, adds captions, and delivers ready-to-post shorts.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/signup">
              <ShimmerButton className="h-14 px-10 text-lg">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </ShimmerButton>
            </Link>
            <Button variant="outline" size="xl" className="gap-2">
              <Play className="h-4 w-4" /> Watch Demo
            </Button>
          </motion.div>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 text-sm text-white/40"
          >
            No credit card required &middot; 1 free export at 720p &middot; No watermark
          </motion.p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 border-y border-white/5">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-white sm:text-4xl">
                <NumberTicker value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-1 text-sm text-white/50">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 10 Agents Pipeline */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">
              <AnimatedGradientText>10 AI Agents</AnimatedGradientText> Working Together
            </h2>
            <p className="mt-4 text-white/50 max-w-2xl mx-auto">
              Each agent specializes in one task. Together they produce shorts that rival
              professional editing teams.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.name}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="relative group hover:border-violet-500/30 transition-all duration-300 h-full">
                  <BorderBeam size={100} duration={8} delay={i * 0.5} />
                  <CardContent className="p-4 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                      <agent.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-white text-sm">{agent.name}</h3>
                    <p className="mt-1 text-xs text-white/40">{agent.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitor Comparison */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              See How We <AnimatedGradientText>Stack Up</AnimatedGradientText>
            </h2>
            <p className="mt-4 text-white/50">
              Feature-by-feature comparison. No marketing spin — just facts.
            </p>
          </motion.div>

          <motion.div {...fadeUp} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-left text-white/60 font-medium">Feature</th>
                  <th className="py-3 px-4 text-center font-bold text-violet-400">AgentCut</th>
                  <th className="py-3 px-4 text-center text-white/40">Opus Clip</th>
                  <th className="py-3 px-4 text-center text-white/40">Submagic</th>
                  <th className="py-3 px-4 text-center text-white/40">Veed.io</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.feature} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-white/70">{row.feature}</td>
                    <td className="py-3 px-4 text-center">
                      {row.agentcut ? (
                        <Check className="mx-auto h-5 w-5 text-emerald-400" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-red-400/50" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.opus ? (
                        <Check className="mx-auto h-5 w-5 text-white/30" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-red-400/30" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.submagic ? (
                        <Check className="mx-auto h-5 w-5 text-white/30" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-red-400/30" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.veed ? (
                        <Check className="mx-auto h-5 w-5 text-white/30" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-red-400/30" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* What Competitors Hide */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              What Competitors <span className="text-pink-500">Don&apos;t Tell You</span>
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                competitor: "Opus Clip",
                gotchas: [
                  "Editor, AI hook, B-Roll gated behind $39+ Pro+ tier",
                  "API only on $99/mo Business plan",
                  "3-day file expiry — your exports disappear",
                  "60min/month free tier has watermarks",
                ],
              },
              {
                competitor: "Submagic",
                gotchas: [
                  "Browser-only, no mobile app",
                  "$12/month ADD-ON for Magic Clips",
                  "Caption-focused, weak clip selection AI",
                  "Multiple billing dispute complaints online",
                ],
              },
            ].map((item) => (
              <motion.div key={item.competitor} {...fadeUp}>
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{item.competitor}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {item.gotchas.map((gotcha) => (
                        <li key={gotcha} className="flex items-start gap-2 text-sm text-white/60">
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" />
                          {gotcha}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="mt-8">
            <Card className="relative overflow-hidden border-violet-500/20">
              <BorderBeam />
              <CardHeader>
                <CardTitle className="text-lg text-violet-400">AgentCut AI — No Gotchas</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {[
                    "All features on $15 Starter plan — no gating",
                    "API access from $15 — competitors charge $99+",
                    "3x more credits than Opus Clip Pro at same price",
                    "INR pricing for Indian creators",
                    "No watermark on free tier",
                    "7-day file retention (not 3 days)",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-white/70">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/[0.02]">
        <div className="mx-auto max-w-6xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Loved by <AnimatedGradientText>Creators</AnimatedGradientText>
            </h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} {...fadeUp} transition={{ delay: i * 0.1 }}>
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex gap-1 mb-3">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-white/70 italic">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-4 border-t border-white/5 pt-3">
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-white/40">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to Create <AnimatedGradientText>Viral Shorts</AnimatedGradientText>?
          </h2>
          <p className="mt-4 text-white/50">
            Join thousands of creators who use AgentCut AI to turn their long-form content
            into scroll-stopping short-form videos.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup">
              <ShimmerButton className="h-14 px-10 text-lg">
                Start Free — No Credit Card <ArrowRight className="ml-2 h-5 w-5" />
              </ShimmerButton>
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
