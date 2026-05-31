"use client";

import { motion } from "framer-motion";
import { BarChart3, Clock, Zap, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { NumberTicker } from "@/components/magic/number-ticker";
import { Particles } from "@/components/magic/particles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const weeklyData = [12, 8, 15, 22, 18, 25, 20];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const clipScores = [
  { title: "The $10M Mindset Shift", score: 92, views: "12.4K" },
  { title: "Why Most Founders Fail", score: 85, views: "8.7K" },
  { title: "The Hiring Secret", score: 78, views: "5.2K" },
  { title: "Scale Without Burnout", score: 88, views: "10.1K" },
  { title: "First 1000 Customers", score: 81, views: "6.8K" },
];

export default function AnalyticsPage() {
  const maxVal = Math.max(...weeklyData);

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      <Particles className="opacity-15" quantity={25} />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold mb-1">Analytics</h1>
          <p className="text-white/50 text-sm mb-8">Track your content performance</p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: BarChart3, label: "Videos Generated", value: 47, color: "text-violet-400" },
            { icon: Clock, label: "Avg Processing Time", value: 4, suffix: " min", color: "text-cyan-400" },
            { icon: Zap, label: "Credits Used", value: 342, suffix: "/500", color: "text-pink-400" },
            { icon: TrendingUp, label: "Avg Retention Score", value: 84, suffix: "%", color: "text-emerald-400" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-5">
                  <stat.icon className={`h-5 w-5 ${stat.color} mb-3`} />
                  <p className="text-2xl font-bold">
                    <NumberTicker value={stat.value} suffix={stat.suffix || ""} />
                  </p>
                  <p className="text-xs text-white/40 mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Videos Generated Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Videos Generated (This Week)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-40">
                {weeklyData.map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t bg-gradient-to-t from-violet-600 to-cyan-500"
                      initial={{ height: 0 }}
                      animate={{ height: `${(val / maxVal) * 100}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                    />
                    <span className="text-[10px] text-white/30">{days[i]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Per-clip Retention Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Clips by Retention Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clipScores.map((clip, i) => (
                  <motion.div
                    key={clip.title}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{clip.title}</p>
                      <p className="text-xs text-white/30">{clip.views} predicted views</p>
                    </div>
                    <div className="w-24">
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            clip.score >= 85
                              ? "bg-emerald-500"
                              : clip.score >= 70
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${clip.score}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono w-8 text-right">{clip.score}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
