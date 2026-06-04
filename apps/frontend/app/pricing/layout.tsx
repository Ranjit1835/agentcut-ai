import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Simple, Honest Plans",
  description:
    "All features unlocked from $15/month. No hidden upsells or feature gating. Get 3x more credits than competitors, API access from day one, and INR pricing for Indian creators.",
  openGraph: {
    title: "AgentCut AI Pricing — All Features from $15/month",
    description:
      "Simple, honest pricing with no feature gating. API access, 4K exports, auto-captions, and more. Compare with Opus Clip, Submagic, and Veed.io.",
    type: "website",
    siteName: "AgentCut AI",
    images: [
      {
        url: "https://agentcut.ai/og-pricing.png",
        width: 1200,
        height: 630,
        alt: "AgentCut AI Pricing Plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentCut AI Pricing — All Features from $15/month",
    description:
      "No feature gating. API access from $15. 3x more credits than competitors.",
    images: ["https://agentcut.ai/og-pricing.png"],
  },
  keywords: [
    "AI video editing pricing",
    "AgentCut pricing",
    "video AI plans",
    "cheap AI video editor",
    "Opus Clip alternative",
    "Submagic alternative",
    "video editing subscription",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
