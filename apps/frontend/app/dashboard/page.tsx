"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, Video, Clock, Zap, MoreHorizontal, Play, Sparkles } from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { NumberTicker } from "@/components/magic/number-ticker";
import { BorderBeam } from "@/components/magic/border-beam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Particles } from "@/components/magic/particles";

const recentProjects = [
  {
    id: "1",
    title: "How I Built a $10M Startup",
    status: "complete" as const,
    clips: 5,
    created: "2 hours ago",
    thumbnail: null,
  },
  {
    id: "2",
    title: "Morning Routine Podcast Ep. 45",
    status: "processing" as const,
    clips: 0,
    created: "30 minutes ago",
    thumbnail: null,
  },
  {
    id: "3",
    title: "React Server Components Deep Dive",
    status: "complete" as const,
    clips: 8,
    created: "1 day ago",
    thumbnail: null,
  },
];

const statusColors = {
  complete: "text-emerald-400 bg-emerald-500/10",
  processing: "text-cyan-400 bg-cyan-500/10",
  failed: "text-red-400 bg-red-500/10",
  pending: "text-yellow-400 bg-yellow-500/10",
};

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      <Particles className="opacity-20" quantity={30} />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-white/50 text-sm mt-1">Manage your video projects</p>
          </div>
          <Link href="/upload">
            <ShimmerButton className="h-10 px-6 text-sm">
              <Plus className="mr-2 h-4 w-4" /> New Project
            </ShimmerButton>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { icon: Zap, label: "Credits Remaining", value: 145, suffix: "/150", color: "text-violet-400" },
            { icon: Video, label: "Videos Generated", value: 23, suffix: "", color: "text-cyan-400" },
            { icon: Clock, label: "Avg Processing", value: 4, suffix: " min", color: "text-pink-400" },
            { icon: Play, label: "Total Clips", value: 87, suffix: "", color: "text-emerald-400" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-2xl font-bold">
                      <NumberTicker value={stat.value} suffix={stat.suffix} />
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/40">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Recent Projects */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Projects</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/projects/${project.id}/editor`}>
                  <Card className="relative group hover:border-violet-500/30 transition-all duration-300 cursor-pointer">
                    <BorderBeam size={100} duration={10} delay={i} />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-20 w-full rounded-lg bg-gradient-to-br from-violet-500/10 to-cyan-500/10 flex items-center justify-center">
                          <Video className="h-8 w-8 text-white/20" />
                        </div>
                      </div>
                      <h3 className="font-medium text-sm truncate">{project.title}</h3>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge
                          className={statusColors[project.status]}
                        >
                          {project.status}
                        </Badge>
                        <span className="text-xs text-white/30">
                          {project.clips} clips &middot; {project.created}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Plan Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="border-violet-500/20">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="px-3 py-1">
                  <Sparkles className="mr-1 h-3 w-3" /> Starter Plan
                </Badge>
                <span className="text-sm text-white/50">
                  145 of 150 credits remaining this month
                </span>
              </div>
              <Link href="/pricing">
                <Badge variant="outline" className="cursor-pointer hover:bg-white/5">
                  Upgrade
                </Badge>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
