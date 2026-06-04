import posthog, { type PostHog } from "posthog-js";

// ── PostHog Client Initialization ───────────────────────────────────────────
// Only initializes when NEXT_PUBLIC_POSTHOG_KEY is set.
// Disabled in development unless NEXT_PUBLIC_POSTHOG_DEV=true is set.

let posthogClient: PostHog | null = null;

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
const IS_SERVER = typeof window === "undefined";
const IS_DEV = process.env.NODE_ENV === "development";
const DEV_ENABLED = process.env.NEXT_PUBLIC_POSTHOG_DEV === "true";

/**
 * Returns the PostHog client singleton.
 * Returns `null` when:
 * - Running on the server (SSR)
 * - NEXT_PUBLIC_POSTHOG_KEY is not set
 * - In development mode without NEXT_PUBLIC_POSTHOG_DEV=true
 */
export function getPostHogClient(): PostHog | null {
  if (IS_SERVER) return null;
  if (!POSTHOG_KEY) return null;
  if (IS_DEV && !DEV_ENABLED) return null;

  if (!posthogClient) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // We capture manually in the provider for SPA routing
      capture_pageleave: true,
      autocapture: true,
      persistence: "localStorage+cookie",
      cross_subdomain_cookie: false,
      secure_cookie: true,
      loaded: (ph) => {
        // Opt out of tracking in development unless explicitly enabled
        if (IS_DEV && !DEV_ENABLED) {
          ph.opt_out_capturing();
        }
      },
    });

    posthogClient = posthog;
  }

  return posthogClient;
}

/**
 * Identify a user after login/signup.
 */
export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogClient();
  if (!client) return;
  client.identify(userId, properties);
}

/**
 * Reset identity on logout.
 */
export function resetUser(): void {
  const client = getPostHogClient();
  if (!client) return;
  client.reset();
}

/**
 * Track a custom event.
 */
export function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  const client = getPostHogClient();
  if (!client) return;
  client.capture(eventName, properties);
}

export { posthog };
export default getPostHogClient;
