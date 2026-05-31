"use client";

import { motion } from "framer-motion";
import { User, Key, Palette, Bell, Shield } from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { Particles } from "@/components/magic/particles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      <Particles className="opacity-15" quantity={20} />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-3xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-white/50 text-sm mb-8">Manage your account preferences</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-white/40" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Full Name</label>
                    <Input defaultValue="Alex Chen" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Email</label>
                    <Input defaultValue="alex@creator.com" disabled />
                  </div>
                </div>
                <Button size="sm">Save Changes</Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Connected Accounts */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-white/40" />
                  Connected Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs">G</div>
                    <div>
                      <p className="text-sm">Google</p>
                      <p className="text-xs text-white/40">alex@creator.com</p>
                    </div>
                  </div>
                  <Badge variant="success">Connected</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* API Keys */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4 text-white/40" />
                  API Keys
                  <Badge className="ml-2 text-[10px]">Starter+</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <div>
                    <p className="text-sm">Production Key</p>
                    <p className="text-xs text-white/30 font-mono">ac_live_****...****7f3d</p>
                  </div>
                  <Button variant="outline" size="sm">Reveal</Button>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Generate New Key
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Brand Kit */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-white/40" />
                  Brand Kit
                  <Badge className="ml-2 text-[10px]">Pro+</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Primary Color</label>
                    <div className="flex gap-2">
                      <div className="h-10 w-10 rounded-lg bg-violet-500 border border-white/10" />
                      <Input defaultValue="#8B5CF6" className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Secondary Color</label>
                    <div className="flex gap-2">
                      <div className="h-10 w-10 rounded-lg bg-cyan-500 border border-white/10" />
                      <Input defaultValue="#06B6D4" className="flex-1" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Logo</label>
                  <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-white/30">
                    Drop your logo here or click to upload
                  </div>
                </div>
                <Button size="sm">Save Brand Kit</Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-white/40" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Processing complete", desc: "Get notified when your video is ready" },
                    { label: "Credit alerts", desc: "Alert when credits are running low" },
                    { label: "Product updates", desc: "New features and improvements" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm">{item.label}</p>
                        <p className="text-xs text-white/40">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked className="peer sr-only" />
                        <div className="h-5 w-9 rounded-full bg-white/10 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white/30 after:transition-all peer-checked:bg-violet-600 peer-checked:after:translate-x-full peer-checked:after:bg-white" />
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
