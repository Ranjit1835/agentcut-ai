"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

// ── QueryClient configuration ────────────────────────────────────────────────
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set a staleTime > 0 to avoid
        // refetching immediately on the client after server render.
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && "status" in error) {
            const status = (error as Error & { status: number }).status;
            if (status >= 400 && status < 500) return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

// Singleton for the server to avoid creating new query client on every request
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

// ── Providers Component ──────────────────────────────────────────────────────
interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // NOTE: Avoid useState when initializing the query client if you don't
  // have a suspense boundary between this and the code that may suspend
  // because React will throw away the client on the initial render if it
  // suspends and there is no boundary
  const [queryClient] = useState(() => getQueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      forcedTheme="dark"
    >
      <QueryClientProvider client={queryClient}>
        {children}

        {/* Sonner toast notifications */}
        <Toaster
          position="bottom-right"
          expand={false}
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              background: "#16161F",
              border: "1px solid #1E1E2E",
              color: "#F8F8FF",
              fontFamily: "var(--font-geist-sans)",
            },
            classNames: {
              toast: "group-[.toaster]:shadow-card-dark",
              title: "text-sm font-medium",
              description: "text-xs text-[#A0A0B8]",
              actionButton:
                "bg-violet-600 text-white hover:bg-violet-700 text-xs px-2 py-1 rounded-md",
              cancelButton:
                "bg-[#1E1E2E] text-[#A0A0B8] hover:bg-[#2A2A3E] text-xs px-2 py-1 rounded-md",
              closeButton:
                "bg-[#1E1E2E] text-[#A0A0B8] hover:bg-[#2A2A3E] border-[#1E1E2E]",
            },
          }}
        />

        {/* React Query DevTools — only in development */}
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
