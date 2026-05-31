"use client";

import { motion } from "framer-motion";
import { CreditCard, Receipt, ExternalLink, Sparkles, Zap } from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { NumberTicker } from "@/components/magic/number-ticker";
import { BorderBeam } from "@/components/magic/border-beam";
import { Particles } from "@/components/magic/particles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const invoices = [
  { id: "INV-001", date: "May 1, 2024", amount: "$29.00", status: "Paid" },
  { id: "INV-002", date: "Apr 1, 2024", amount: "$29.00", status: "Paid" },
  { id: "INV-003", date: "Mar 1, 2024", amount: "$15.00", status: "Paid" },
];

export default function BillingPage() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      <Particles className="opacity-15" quantity={20} />
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold mb-1">Billing</h1>
          <p className="text-white/50 text-sm mb-8">Manage your subscription and usage</p>
        </motion.div>

        {/* Current Plan */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="relative border-violet-500/20 mb-6">
            <BorderBeam />
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                    <Sparkles className="h-6 w-6 text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold">Pro Plan</h2>
                      <Badge>Active</Badge>
                    </div>
                    <p className="text-sm text-white/50">$29/month &middot; Renews June 1, 2024</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Manage on Polar
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Credit Usage */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" />
                Credit Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-white/60">
                  <NumberTicker value={342} /> of 500 credits used
                </span>
                <span className="text-sm font-medium text-emerald-400">158 remaining</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: "68.4%" }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
              <p className="mt-2 text-xs text-white/30">Credits reset on June 1, 2024</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invoice History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-white/40" />
                Invoice History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-white/30" />
                      <div>
                        <p className="text-sm">{invoice.id}</p>
                        <p className="text-xs text-white/40">{invoice.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{invoice.amount}</span>
                      <Badge variant="success" className="text-[10px]">{invoice.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
