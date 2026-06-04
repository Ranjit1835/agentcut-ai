# AgentCut AI — Deployment Guide

## Architecture

```
[Browser] --> [Next.js Frontend (Railway)] --> [FastAPI Backend (Railway)]
                     |                               |
               [Supabase Auth]              [Groq Whisper API]
                                            [Claude API]
                                            [FFmpeg (in container)]
                                            [Cloudflare R2 Storage]
```

Two Railway services from one repo. Backend does all heavy processing (video download, transcription, AI analysis, FFmpeg rendering). Frontend is a Next.js app that talks to the backend API.

---

## Step 1: Create R2 Bucket

1. Go to https://dash.cloudflare.com → R2 Object Storage
2. Click "Create bucket"
3. Name: `agentcut`
4. Location: Auto (or pick closest to Railway region)
5. Click "Create bucket"
6. Note your Account ID from the R2 overview page (used in R2_ENDPOINT_URL)

---

## Step 2: Rotate All Secrets

Generate new keys for every service — the old ones were exposed during development.

| Service | Where to rotate |
|---------|----------------|
| Anthropic API Key | https://console.anthropic.com/settings/keys |
| Groq API Key | https://console.groq.com/keys |
| Supabase Service Role Key | Supabase Dashboard > Settings > API |
| Supabase JWT Secret | Supabase Dashboard > Settings > API |
| Database Password | Supabase Dashboard > Settings > Database > Reset password |
| R2 API Token | Cloudflare Dashboard > R2 > Manage R2 API Tokens |
| Backend Secret Key | Run: `openssl rand -hex 32` |

---

## Step 3: Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

---

## Step 4: Create Railway Project

```bash
cd AGENTCUT
railway init
# Name it: agentcut-ai
# Link to this repo when prompted
```

---

## Step 5: Create Backend Service

```bash
railway service create ai-backend
railway link  # select ai-backend service

# Set ALL environment variables (paste your rotated values):
railway variables set ENVIRONMENT=production
railway variables set BACKEND_SECRET_KEY=<your-new-32char-secret>
railway variables set ALLOWED_ORIGINS='["https://YOUR-FRONTEND.up.railway.app"]'

# Supabase
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://heyrjrdwhxuwatzxpxmi.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
railway variables set SUPABASE_SERVICE_ROLE_KEY=<your-new-service-role-key>
railway variables set SUPABASE_JWT_SECRET=<your-new-jwt-secret>
railway variables set DATABASE_URL='postgresql://postgres:<new-password>@db.heyrjrdwhxuwatzxpxmi.supabase.co:5432/postgres'

# AI Providers
railway variables set ANTHROPIC_API_KEY=<your-new-anthropic-key>
railway variables set GROQ_API_KEY=<your-new-groq-key>
railway variables set OPENAI_API_KEY=

# R2 Storage
railway variables set AWS_ACCESS_KEY_ID=<your-new-r2-access-key>
railway variables set AWS_SECRET_ACCESS_KEY=<your-new-r2-secret-key>
railway variables set AWS_REGION=auto
railway variables set R2_BUCKET_NAME=agentcut
railway variables set R2_ENDPOINT_URL='https://<your-cf-account-id>.r2.cloudflarestorage.com'
railway variables set R2_PUBLIC_URL='https://<your-cf-account-id>.r2.cloudflarestorage.com'

# Optional (leave empty to disable)
railway variables set LANGCHAIN_TRACING_V2=false
railway variables set LANGCHAIN_API_KEY=
railway variables set SENTRY_DSN=
railway variables set POSTHOG_API_KEY=
railway variables set REDIS_URL=
railway variables set INNGEST_EVENT_KEY=
railway variables set INNGEST_SIGNING_KEY=

# Configure build
railway settings set rootDirectory=apps/ai-backend
railway settings set buildCommand=""
railway settings set startCommand="uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"
```

Deploy the backend:
```bash
railway up
```

Note the backend URL (e.g. `https://ai-backend-production-XXXX.up.railway.app`).

Test it:
```bash
curl https://ai-backend-production-XXXX.up.railway.app/health
# Should return: {"status":"healthy","version":"0.1.0","environment":"production"}
```

---

## Step 6: Create Frontend Service

```bash
railway service create frontend
railway link  # select frontend service

# Runtime env vars
railway variables set NODE_ENV=production
railway variables set SUPABASE_SERVICE_ROLE_KEY=<same-key-as-backend>

# Build args (NEXT_PUBLIC_* are inlined at build time)
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://heyrjrdwhxuwatzxpxmi.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
railway variables set NEXT_PUBLIC_API_URL=https://ai-backend-production-XXXX.up.railway.app
railway variables set NEXT_PUBLIC_APP_URL=https://frontend-production-XXXX.up.railway.app

# Configure build (context = repo root, Dockerfile = apps/frontend/Dockerfile)
railway settings set dockerfilePath=apps/frontend/Dockerfile
```

Deploy the frontend:
```bash
railway up
```

Note the frontend URL (e.g. `https://frontend-production-XXXX.up.railway.app`).

---

## Step 7: Update CORS + Supabase

### Update backend CORS:
```bash
railway link  # select ai-backend
railway variables set ALLOWED_ORIGINS='["https://frontend-production-XXXX.up.railway.app"]'
railway up  # redeploy to pick up new CORS
```

### Update Supabase Auth redirect:
1. Supabase Dashboard > Authentication > URL Configuration
2. Set Site URL to: `https://frontend-production-XXXX.up.railway.app`
3. Add to Redirect URLs: `https://frontend-production-XXXX.up.railway.app/auth/callback`

---

## Step 8: Test End-to-End

1. Open `https://frontend-production-XXXX.up.railway.app`
2. Sign in with Google or email
3. Paste a YouTube URL
4. Watch agents process in real-time
5. View generated clips in the editor

---

## Optional: Custom Domain

```bash
# Backend
railway link  # select ai-backend
railway domain add api.yourdomain.com

# Frontend
railway link  # select frontend
railway domain add app.yourdomain.com

# Then update:
# - NEXT_PUBLIC_API_URL = https://api.yourdomain.com
# - NEXT_PUBLIC_APP_URL = https://app.yourdomain.com
# - ALLOWED_ORIGINS = ["https://app.yourdomain.com"]
# - Supabase redirect URLs
```

---

## Troubleshooting

### YouTube blocks downloads on Railway
Set the cookies env var:
```bash
railway link  # select ai-backend
railway variables set YT_DLP_COOKIES_FILE=/app/cookies.txt
```
Then upload a cookies.txt (exported from your browser with a YouTube-logged-in session) to the container, or mount via Railway volume.

### Pipeline takes too long
Railway Pro gives 8GB RAM + 8 vCPU. The render agent encodes video with FFmpeg — each clip takes ~30-60s at 1080p. For a 5-clip project, rendering alone is ~3-5 minutes. This is normal.

### WebSocket doesn't connect
Check that ALLOWED_ORIGINS includes the frontend URL with `https://` prefix (not `http://`).

---

## Cost Estimates

| Service | Cost |
|---------|------|
| Railway Pro | $5/month base + usage (~$0.01/min CPU) |
| Anthropic Claude | ~$0.10/project (Sonnet + Haiku calls) |
| Groq Whisper | ~$0.01/minute of audio |
| Cloudflare R2 | ~$0.015/GB stored, free egress |
| Supabase | Free tier (auth + database) |
| **Total per project** | **~$0.15-0.50** |
