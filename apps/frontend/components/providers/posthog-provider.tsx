"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog";

// ── PostHog Provider ────────────────────────────────────────────────────────
// Wraps the app to enable PostHog analytics with SPA page-view tracking.
// Only activates when NEXT_PUBLIC_POSTHOG_KEY is set and conditions are met.

function PostHogPageView(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string>("");

  useEffect(() => {
    const client = getPostHogClient();
    if (!client) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Deduplicate rapid-fire navigations to the same URL
    if (url === lastTrackedUrl.current) return;
    lastTrackedUrl.current = url;

    client.capture("$pageview", {
      $current_url: window.origin + url,
    });
  }, [pathname, searchParams]);

  return null;
}

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    // Eagerly initialize the client on mount
    getPostHogClient();
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
