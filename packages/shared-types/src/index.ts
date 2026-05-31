// ── Enums ─────────────────────────────────────────────────────────────────────

export type ProcessingStage =
  | "pending"
  | "ingesting"
  | "transcribing"
  | "analyzing"
  | "selecting_clips"
  | "cutting"
  | "captioning"
  | "effects"
  | "quality_check"
  | "rendering"
  | "complete"
  | "failed";

export type AgentName =
  | "ingest"
  | "transcript"
  | "story"
  | "cut"
  | "caption"
  | "effects"
  | "broll"
  | "quality"
  | "render"
  | "feedback";

export type AgentStatus =
  | "pending"
  | "running"
  | "complete"
  | "failed"
  | "skipped"
  | "retrying";

export type PlanTier = "free" | "starter" | "pro" | "studio";
export type Currency = "usd" | "inr";
export type SourceType = "youtube" | "upload" | "url" | "tiktok" | "instagram";

export type StylePreset =
  | "mrbeast"
  | "hormozi"
  | "podcast"
  | "storytelling"
  | "educational";

export type RenderResolution = "720p" | "1080p" | "4k";

// ── Core Models ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan_tier: PlanTier;
  credits_remaining: number;
  currency_preference: Currency;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  source_url: string | null;
  source_type: SourceType;
  status: ProcessingStage;
  style_preset: StylePreset;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  project_id: string;
  r2_key: string;
  file_size_bytes: number;
  duration_seconds: number;
  format: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface Transcript {
  id: string;
  project_id: string;
  full_text: string;
  word_timestamps: WordTimestamp[];
  speakers: SpeakerSegment[];
  filler_words: FillerWord[];
  silences: SilenceSegment[];
  language: string;
  created_at: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string | null;
}

export interface SpeakerSegment {
  speaker: string;
  start: number;
  end: number;
  text: string;
}

export interface FillerWord {
  word: string;
  start: number;
  end: number;
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
}

export interface Clip {
  id: string;
  project_id: string;
  clip_index: number;
  title: string;
  start_time: number;
  end_time: number;
  duration: number;
  virality_score: number;
  hook_text: string;
  narrative_summary: string;
  status: AgentStatus;
  created_at: string;
}

export interface AgentJob {
  id: string;
  project_id: string;
  clip_id: string | null;
  agent_name: AgentName;
  status: AgentStatus;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  confidence_score: number | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Render {
  id: string;
  clip_id: string;
  r2_key: string;
  resolution: RenderResolution;
  file_size_bytes: number;
  format: string;
  watermarked: boolean;
  download_url: string;
  expires_at: string;
  created_at: string;
}

export interface FeedbackEvent {
  id: string;
  project_id: string;
  clip_id: string | null;
  user_input: string;
  parsed_actions: Record<string, unknown>;
  agents_rerun: AgentName[];
  status: AgentStatus;
  created_at: string;
}

export interface BillingSubscription {
  id: string;
  user_id: string;
  polar_subscription_id: string;
  plan_tier: PlanTier;
  status: string;
  currency: Currency;
  amount_cents: number;
  current_period_start: string;
  current_period_end: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface BrandKit {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  watermark_url: string | null;
}

// ── API Request/Response ──────────────────────────────────────────────────────

export interface CreateProjectRequest {
  title: string;
  source_url?: string;
  source_type: SourceType;
  style_preset: StylePreset;
  target_clip_count?: number;
  min_clip_duration?: number;
  max_clip_duration?: number;
  custom_instructions?: string;
}

export interface FeedbackRequest {
  project_id: string;
  clip_id?: string;
  user_input: string;
}

export interface AgentProgressEvent {
  project_id: string;
  agent_name: AgentName;
  status: AgentStatus;
  progress_percent: number;
  message: string;
  confidence_score?: number;
  output_preview?: Record<string, unknown>;
  timestamp: string;
}

// ── Pricing ───────────────────────────────────────────────────────────────────

export interface PricingTier {
  name: string;
  tier: PlanTier;
  price_usd: number;
  price_inr: number;
  credits: number;
  resolution: RenderResolution;
  features: string[];
  recommended: boolean;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    tier: "free",
    price_usd: 0,
    price_inr: 0,
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
  },
  {
    name: "Starter",
    tier: "starter",
    price_usd: 15,
    price_inr: 1299,
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
  },
  {
    name: "Pro",
    tier: "pro",
    price_usd: 29,
    price_inr: 2499,
    credits: 500,
    resolution: "4k",
    features: [
      "500 credits/month",
      "4K exports",
      "Brand kits",
      "Priority processing",
      "API access",
      "Priority support",
    ],
    recommended: true,
  },
  {
    name: "Studio",
    tier: "studio",
    price_usd: 99,
    price_inr: 8499,
    credits: 2000,
    resolution: "4k",
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
  },
];
