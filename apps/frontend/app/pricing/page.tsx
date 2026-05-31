"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, ArrowRight, X } from "lucide-react";
import { Navbar } from "@/components/premium/navbar";
import { Footer } from "@/components/premium/footer";
import { ShimmerButton } from "@/components/magic/shimmer-button";
import { AnimatedGradientText } from "@/components/magic/animated-gradient-text";
import { BorderBeam } from "@/components/magic/border-beam";
import { Particles } from "@/components/magic/particles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Currency = "usd" | "inr";

const tiers = [
  {
    name: "Free",
    price: { usd: 0, inr: 0 },
    credits: 30,
    resolution: "720p",
    features: [
      "30 credits/month",
      "1 export at 720p",
      "No watermark",
      "All features included",
      "Slow processing queue",
    ],
    recommended: false,
    cta: "Start Free",
  },
  {
    name: "Starter",
    price: { usd: 15, inr: 1299 },
    credits: 150,
    resolution: "1080p",
    features: [
      "150 credits/month",
      "1080p exports",
      "All features unlocked",
      "API access included",
      "Standard queue",
      "Email support",
    ],
    recommended: false,
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: { usd: 29, inr: 2499 },
    credits: 500,
    resolution: "4K",
    features: [
      "500 credits/month",
      "4K exports",
      "Brand kits",
      "Priority processing",
      "API access",
      "Priority support",
    ],
    recommended: true,
    cta: "Go Pro",
  },
  {
    name: "Studio",
    price: { usd: 99, inr: 8499 },
    credits: 2000,
    resolution: "4K",
    features: [
      "2000 credits/month",
      "4K exports",
      "White-label exports",
      "Team seats",
      "Custom support",
      "API access",
      "Dedicated account manager",
    ],
    recommended: false,
    cta: "Contact Sales",
  },
];

const comparisonRows = [
  { feature: "All features on starter", us: "$15/mo", opus: "$39/mo (Pro+)", submagic: "$23+/mo", veed: "$25+/mo" },
  { feature: "API access", us: "$15/mo", opus: "$99/mo", submagic: "N/A", veed: "Enterprise" },
  { feature: "Credits per month", us: "150", opus: "50", submagic: "60", veed: "N/A" },
  { feature: "Free tier watermark", us: "No", opus: "Yes", submagic: "No", veed: "Yes" },
  { feature: "INR pricing", us: "Yes", opus: "No", submagic: "No", veed: "No" },
  { feature: "Conversational editing", us: "Yes", opus: "No", submagic: "No", veed: "No" },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

export default function PricingPage() {
  const [currency, setCurrency] = useState<Currency>("usd");

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white overflow-hidden">
      <Particles className="opacity-20" quantity={40} />
      <Navbar />

      <main className="pt-32 pb-24 px-4 sm:px-6 lg:px-8">
        <motion.div {...fadeUp} className="text-center mb-16 mx-auto max-w-2xl">
          <h1 className="text-4xl font-bold sm:text-5xl">
            Simple, <AnimatedGradientText>Honest</AnimatedGradientText> Pricing
          </h1>
          <p className="mt-4 text-white/50">
            All features unlocked from $15. No hidden upsells. No feature gating.
          </p>

          {/* Currency Toggle */}
          <div className="mt-8 inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setCurrency("usd")}
              className={`rounded-full px-4 py-1.5 text-sm transition-all ${
                currency === "usd" ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              USD $
            </button>
            <button
              onClick={() => setCurrency("inr")}
              className={`rounded-full px-4 py-1.5 text-sm transition-all ${
                currency === "inr" ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"
              }`}
            >
              INR ₹
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="mx-auto max-w-6xl grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
            >
              <Card
                className={`relative h-full flex flex-col ${
                  tier.recommended ? "border-violet-500/50" : ""
                }`}
              >
                {tier.recommended && (
                  <>
                    <BorderBeam />
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="px-3 py-1 bg-violet-600 text-white border-0">
                        <Sparkles className="mr-1 h-3 w-3" /> Recommended
                      </Badge>
                    </div>
                  </>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  <div className="mt-3">
                    <span className="text-4xl font-bold">
                      {currency === "usd" ? `$${tier.price.usd}` : `₹${tier.price.inr}`}
                    </span>
                    {tier.price.usd > 0 && (
                      <span className="text-white/40 text-sm">/month</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {tier.credits} credits &middot; {tier.resolution} max
                  </p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-2 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-white/60">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    {tier.recommended ? (
                      <ShimmerButton className="w-full h-10 text-sm">
                        {tier.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </ShimmerButton>
                    ) : (
                      <Button variant="outline" className="w-full">
                        {tier.cta}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Callouts */}
        <motion.div
          {...fadeUp}
          className="mt-12 mx-auto max-w-3xl grid gap-4 sm:grid-cols-2"
        >
          {[
            "All features on $15 plan — no gating",
            "API access from $15 — competitors charge $99+",
            "3x more credits than Opus Clip Pro at same price",
            "INR pricing for Indian creators",
          ].map((callout) => (
            <div
              key={callout}
              className="flex items-center gap-2 rounded-lg border border-violet-500/10 bg-violet-500/5 p-3 text-sm"
            >
              <Check className="h-4 w-4 shrink-0 text-violet-400" />
              <span className="text-white/70">{callout}</span>
            </div>
          ))}
        </motion.div>

        {/* Comparison Table */}
        <motion.div {...fadeUp} className="mt-24 mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-8">
            Price Comparison vs Competitors
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-left text-white/60">Feature</th>
                  <th className="py-3 px-4 text-center font-bold text-violet-400">AgentCut</th>
                  <th className="py-3 px-4 text-center text-white/40">Opus Clip</th>
                  <th className="py-3 px-4 text-center text-white/40">Submagic</th>
                  <th className="py-3 px-4 text-center text-white/40">Veed.io</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.feature} className="border-b border-white/5">
                    <td className="py-3 px-4 text-white/70">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-violet-300 font-medium">{row.us}</td>
                    <td className="py-3 px-4 text-center text-white/40">{row.opus}</td>
                    <td className="py-3 px-4 text-center text-white/40">{row.submagic}</td>
                    <td className="py-3 px-4 text-center text-white/40">{row.veed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
