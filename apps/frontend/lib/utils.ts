import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names safely, resolving conflicts.
 * Uses clsx for conditional class logic and tailwind-merge for deduplication.
 *
 * @example
 * cn("px-4 py-2", condition && "bg-violet-600", "text-white")
 * cn({ "opacity-50": isDisabled, "cursor-not-allowed": isDisabled })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a duration in seconds to a human-readable string.
 * e.g. 125 => "2:05"  |  3661 => "1:01:01"
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Formats a file size in bytes to a human-readable string.
 * e.g. 1536 => "1.5 KB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i];
  if (!size) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${size}`;
}

/**
 * Formats a timestamp to a relative time string.
 * e.g. new Date() - 5 minutes => "5 minutes ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return then.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: then.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Truncates a string to a maximum length, adding an ellipsis if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Extracts a YouTube video ID from a URL.
 * Returns null if not a valid YouTube URL.
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(url);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Returns a color class based on a virality score (0-100).
 */
export function getViralityColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-violet-400";
  if (score >= 40) return "text-cyan-400";
  if (score >= 20) return "text-amber-400";
  return "text-red-400";
}

/**
 * Returns a gradient fill percentage class for the virality bar.
 */
export function getViralityLabel(score: number): string {
  if (score >= 80) return "Viral Potential";
  if (score >= 60) return "High Engagement";
  if (score >= 40) return "Good Content";
  if (score >= 20) return "Average";
  return "Low Impact";
}

/**
 * Generates a deterministic avatar color from a string (e.g. user ID or email).
 */
export function getAvatarColor(seed: string): string {
  const colors = [
    "bg-violet-600",
    "bg-cyan-600",
    "bg-pink-600",
    "bg-indigo-600",
    "bg-teal-600",
    "bg-purple-600",
    "bg-blue-600",
    "bg-emerald-600",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index] ?? "bg-violet-600";
}

/**
 * Sleeps for a given number of milliseconds.
 * Useful for rate limiting or adding delays in async flows.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamps a number between min and max values.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
