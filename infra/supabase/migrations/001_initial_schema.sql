-- AgentCut AI — Initial Database Schema
-- Supabase (PostgreSQL) with Row-Level Security

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────
CREATE TYPE plan_tier AS ENUM ('free', 'starter', 'pro', 'studio');
CREATE TYPE currency_type AS ENUM ('usd', 'inr');
CREATE TYPE source_type AS ENUM ('youtube', 'upload', 'url', 'tiktok', 'instagram');
CREATE TYPE processing_stage AS ENUM (
  'pending', 'ingesting', 'transcribing', 'analyzing',
  'selecting_clips', 'cutting', 'captioning', 'effects',
  'quality_check', 'rendering', 'complete', 'failed'
);
CREATE TYPE agent_name AS ENUM (
  'ingest', 'transcript', 'story', 'cut', 'caption',
  'effects', 'broll', 'quality', 'render', 'feedback'
);
CREATE TYPE agent_status AS ENUM (
  'pending', 'running', 'complete', 'failed', 'skipped', 'retrying'
);
CREATE TYPE style_preset AS ENUM (
  'mrbeast', 'hormozi', 'podcast', 'storytelling', 'educational'
);
CREATE TYPE render_resolution AS ENUM ('720p', '1080p', '4k');
CREATE TYPE subscription_status AS ENUM (
  'active', 'canceled', 'past_due', 'trialing', 'paused'
);
CREATE TYPE notification_type AS ENUM (
  'processing_complete', 'processing_failed', 'credits_low',
  'subscription_updated', 'system'
);

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  plan_tier plan_tier NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 30,
  currency_preference currency_type NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_plan ON users(plan_tier);

-- ── Projects ──────────────────────────────────────────────────────────────────
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  source_url TEXT,
  source_type source_type NOT NULL DEFAULT 'youtube',
  status processing_stage NOT NULL DEFAULT 'pending',
  style_preset style_preset NOT NULL DEFAULT 'mrbeast',
  target_clip_count INTEGER NOT NULL DEFAULT 5,
  min_clip_duration FLOAT NOT NULL DEFAULT 15.0,
  max_clip_duration FLOAT NOT NULL DEFAULT 90.0,
  custom_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_created ON projects(created_at DESC);

-- ── Uploads ───────────────────────────────────────────────────────────────────
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_seconds FLOAT NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT 'mp4',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_uploads_project ON uploads(project_id);

-- ── Transcripts ───────────────────────────────────────────────────────────────
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  full_text TEXT NOT NULL DEFAULT '',
  word_timestamps JSONB NOT NULL DEFAULT '[]'::jsonb,
  speakers JSONB NOT NULL DEFAULT '[]'::jsonb,
  filler_words JSONB NOT NULL DEFAULT '[]'::jsonb,
  silences JSONB NOT NULL DEFAULT '[]'::jsonb,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transcripts_project ON transcripts(project_id);

-- ── Clips ─────────────────────────────────────────────────────────────────────
CREATE TABLE clips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clip_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL DEFAULT '',
  start_time FLOAT NOT NULL DEFAULT 0,
  end_time FLOAT NOT NULL DEFAULT 0,
  duration FLOAT GENERATED ALWAYS AS (end_time - start_time) STORED,
  virality_score INTEGER NOT NULL DEFAULT 0 CHECK (virality_score BETWEEN 0 AND 100),
  hook_text TEXT NOT NULL DEFAULT '',
  narrative_summary TEXT NOT NULL DEFAULT '',
  status agent_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clips_project ON clips(project_id);
CREATE INDEX idx_clips_virality ON clips(virality_score DESC);

-- ── Agent Jobs ────────────────────────────────────────────────────────────────
CREATE TABLE agent_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE SET NULL,
  agent_name agent_name NOT NULL,
  status agent_status NOT NULL DEFAULT 'pending',
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  confidence_score FLOAT CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)),
  retry_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_jobs_project ON agent_jobs(project_id);
CREATE INDEX idx_agent_jobs_status ON agent_jobs(status);
CREATE INDEX idx_agent_jobs_agent ON agent_jobs(agent_name);

-- ── Renders ───────────────────────────────────────────────────────────────────
CREATE TABLE renders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  resolution render_resolution NOT NULL DEFAULT '1080p',
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  format TEXT NOT NULL DEFAULT 'mp4',
  watermarked BOOLEAN NOT NULL DEFAULT false,
  download_url TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_renders_clip ON renders(clip_id);

-- ── Feedback Events ──────────────────────────────────────────────────────────
CREATE TABLE feedback_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE SET NULL,
  user_input TEXT NOT NULL,
  parsed_actions JSONB NOT NULL DEFAULT '{}'::jsonb,
  agents_rerun TEXT[] NOT NULL DEFAULT '{}',
  status agent_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_project ON feedback_events(project_id);

-- ── Billing Subscriptions ─────────────────────────────────────────────────────
CREATE TABLE billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  polar_subscription_id TEXT NOT NULL UNIQUE,
  plan_tier plan_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  currency currency_type NOT NULL DEFAULT 'usd',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_billing_user ON billing_subscriptions(user_id);
CREATE INDEX idx_billing_status ON billing_subscriptions(status);

-- ── Usage Metrics ─────────────────────────────────────────────────────────────
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  credits_used INTEGER NOT NULL DEFAULT 0,
  processing_time_seconds FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_user ON usage_metrics(user_id);
CREATE INDEX idx_usage_created ON usage_metrics(created_at DESC);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE NOT read;

-- ── API Keys ──────────────────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Default',
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ── Brand Kits ────────────────────────────────────────────────────────────────
CREATE TABLE brand_kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#8B5CF6',
  secondary_color TEXT NOT NULL DEFAULT '#06B6D4',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  watermark_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_brand_kits_user ON brand_kits(user_id);

-- ── Updated-at Trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER billing_updated_at BEFORE UPDATE ON billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brand_kits_updated_at BEFORE UPDATE ON brand_kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY POLICIES
-- Every table enforces: users can only access their own data
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- Projects: own projects
CREATE POLICY projects_all ON projects FOR ALL USING (auth.uid() = user_id);

-- Uploads: via project ownership
CREATE POLICY uploads_all ON uploads FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = uploads.project_id AND projects.user_id = auth.uid()));

-- Transcripts: via project ownership
CREATE POLICY transcripts_all ON transcripts FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = transcripts.project_id AND projects.user_id = auth.uid()));

-- Clips: via project ownership
CREATE POLICY clips_all ON clips FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = clips.project_id AND projects.user_id = auth.uid()));

-- Agent Jobs: via project ownership
CREATE POLICY agent_jobs_all ON agent_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = agent_jobs.project_id AND projects.user_id = auth.uid()));

-- Renders: via clip → project ownership
CREATE POLICY renders_all ON renders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM clips
    JOIN projects ON projects.id = clips.project_id
    WHERE clips.id = renders.clip_id AND projects.user_id = auth.uid()
  ));

-- Feedback: via project ownership
CREATE POLICY feedback_all ON feedback_events FOR ALL
  USING (EXISTS (SELECT 1 FROM projects WHERE projects.id = feedback_events.project_id AND projects.user_id = auth.uid()));

-- Billing: own subscriptions
CREATE POLICY billing_all ON billing_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Usage: own metrics
CREATE POLICY usage_all ON usage_metrics FOR ALL USING (auth.uid() = user_id);

-- Notifications: own notifications
CREATE POLICY notifications_all ON notifications FOR ALL USING (auth.uid() = user_id);

-- API Keys: own keys
CREATE POLICY api_keys_all ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Brand Kits: own kits
CREATE POLICY brand_kits_all ON brand_kits FOR ALL USING (auth.uid() = user_id);

-- ── Auto-create user profile on signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
