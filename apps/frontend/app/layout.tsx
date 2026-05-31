import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import "./globals.css";

// ── Metadata ────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://agentcut.ai"
  ),
  title: {
    default: "AgentCut AI — Intelligent Video Editing",
    template: "%s | AgentCut AI",
  },
  description:
    "Upload any long-form video. AgentCut's multi-agent AI pipeline automatically identifies viral moments, cuts clips, adds captions, and delivers ready-to-post short-form content.",
  keywords: [
    "AI video editing",
    "short form content",
    "viral clips",
    "automatic captions",
    "video AI",
    "content creation",
    "TikTok clips",
    "YouTube Shorts",
  ],
  authors: [{ name: "AgentCut AI" }],
  creator: "AgentCut AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://agentcut.ai",
    siteName: "AgentCut AI",
    title: "AgentCut AI — Intelligent Video Editing",
    description:
      "Multi-agent AI that turns long-form video into viral short-form clips automatically.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AgentCut AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentCut AI — Intelligent Video Editing",
    description:
      "Multi-agent AI that turns long-form video into viral short-form clips.",
    images: ["/og-image.png"],
    creator: "@agentcutai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0F" },
    { media: "(prefers-color-scheme: light)", color: "#0A0A0F" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// ── Root Layout ──────────────────────────────────────────────────────────────
interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to critical external origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </head>
      <body className="min-h-dvh bg-[#0A0A0F] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
