"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Particles } from "@/components/magic/particles";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show OAuth/redirect errors from query params
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Redirect to the page user was trying to access, or dashboard
      const redirectTo = searchParams.get("redirect") || "/dashboard";
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    } catch {
      setError("OAuth login failed. Please try again.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0A0A0F] px-4">
      <Particles className="opacity-15" quantity={20} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">
            Agent<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Cut</span>
          </span>
        </Link>

        <Card className="border-white/10 bg-white/[0.03]">
          <CardContent className="p-8">
            <h1 className="mb-2 text-center text-2xl font-bold text-white">Welcome back</h1>
            <p className="mb-8 text-center text-sm text-white/50">
              Sign in to your account to continue
            </p>

            {/* OAuth Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOAuth("google")}
                type="button"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOAuth("github")}
                type="button"
              >
                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0A0A0F] px-4 text-white/30">or continue with email</span>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="h-12 w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-white/40">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-violet-400 hover:text-violet-300 transition-colors">
                Sign up free
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
