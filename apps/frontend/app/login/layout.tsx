import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your AgentCut AI account to create viral short-form clips from long-form video using 10 specialized AI agents.",
  openGraph: {
    title: "Sign In to AgentCut AI",
    description:
      "Access your AgentCut dashboard. Turn long-form video into viral shorts with AI.",
    type: "website",
    siteName: "AgentCut AI",
  },
  twitter: {
    card: "summary",
    title: "Sign In to AgentCut AI",
    description:
      "Access your AgentCut dashboard. Turn long-form video into viral shorts with AI.",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
