# CareCircle — Deployment Guide

Target: `https://mycarecircle.loamstrategy.com`
Architecture: **Vercel** (React client) + **Railway** (Express server)

---

## Prerequisites

- GitHub account
- Vercel account (vercel.com) — free tier is fine
- Railway account (railway.app) — free trial available
- Access to DNS settings for `loamstrategy.com`

---

## Step 1 — Push Code to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Create a **private** repository named `carecircle` (or whatever you like)
3. Do **not** initialize with README/gitignore (you already have one)

In your terminal, from the `CareCircle` root folder:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/carecircle.git
git push -u origin main
```

---

## Step 2 — Update Supabase Auth Settings

Your production domain needs to be whitelisted in Supabase, otherwise auth redirects will fail.

1. Go to [supabase.com](https://supabase.com) → your project → **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   ```
   https://mycarecircle.loamstrategy.com
   ```
3. Under **Redirect URLs**, add:
   ```
   https://mycarecircle.loamstrategy.com/**
   ```
4. Click **Save**

---

## Step 3 — Deploy Server to Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub account if prompted, then select your `carecircle` repo
4. Railway will detect the repo. When asked which directory to deploy, set the **Root Directory** to `server`
5. Railway will auto-detect Node.js and run `npm start`

### Set Environment Variables in Railway

Go to your Railway service → **Variables** tab → add each of these:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://mycarecircle.loamstrategy.com` |
| `SUPABASE_URL` | `https://diurxdaobvxnqvterpkc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | *(your service role key from Supabase → Settings → API)* |
| `ANTHROPIC_API_KEY` | *(your key from console.anthropic.com)* |
| `RESEND_API_KEY` | `re_LtFcfrQR_L79ai7gtSqUYE41x4gA1zfzU` |
| `TZ` | `America/New_York` *(or your timezone)* |

> **Note:** Leave `RESEND_FROM_EMAIL` unset for now — emails will send from `onboarding@resend.dev`.
> Once you verify a domain in Resend, add it as:
> `RESEND_FROM_EMAIL=My Care Circle <noreply@yourdomain.com>`

6. After variables are set, Railway will redeploy automatically
7. Go to your service → **Settings** → **Networking** → click **Generate Domain**
   - You'll get a URL like `carecircle-server-production.up.railway.app`
   - **Copy this URL** — you'll need it in Step 4

---

## Step 4 — Deploy Client to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub `carecircle` repo
3. On the configuration screen:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`  ← important, click Edit and set this
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)

### Set Environment Variables in Vercel

Before clicking Deploy, go to **Environment Variables** and add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR_RAILWAY_URL.up.railway.app/api/v1` |
| `VITE_SUPABASE_URL` | `https://diurxdaobvxnqvterpkc.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(your anon key from Supabase → Settings → API)* |

> Replace `YOUR_RAILWAY_URL` with the Railway domain from Step 3.

4. Click **Deploy** — Vercel will build and deploy the React app

---

## Step 5 — Add Custom Domain in Vercel

1. In Vercel, go to your project → **Settings** → **Domains**
2. Type `mycarecircle.loamstrategy.com` and click **Add**
3. Vercel will show you a DNS record to add. It will be one of:
   - **CNAME** record: `mycarecircle` → `cname.vercel-dns.com`
   - Or an **A** record (if apex domain)

---

## Step 6 — Configure DNS at Your Domain Registrar

1. Log in to wherever `loamstrategy.com` is managed (GoDaddy, Cloudflare, Namecheap, etc.)
2. Go to **DNS settings** for `loamstrategy.com`
3. Add a new **CNAME** record:
   - **Name / Host:** `mycarecircle`
   - **Value / Points to:** `cname.vercel-dns.com`
   - **TTL:** 3600 (or Auto)
4. Save the record

> DNS propagation can take 5–30 minutes (sometimes up to 24 hours).
> Vercel will automatically provision an SSL certificate once it detects the DNS record.

---

## Step 7 — Verify Everything Works

Once DNS propagates, visit `https://mycarecircle.loamstrategy.com` and check:

- [ ] App loads and you can sign up / log in
- [ ] After login, you land on the Home page (not a 404)
- [ ] Navigating directly to `/log`, `/circle`, `/settings` etc. works (SPA routing)
- [ ] Creating a log entry works (server API reachable)
- [ ] AI features work (Anthropic key is set)
- [ ] Invite emails send successfully

### Quick API health check
Visit in your browser:
```
https://YOUR_RAILWAY_URL.up.railway.app/api/health
```
You should see: `{"status":"ok","env":"production"}`

---

## Ongoing Updates

After making code changes locally:

```bash
git add .
git commit -m "your change description"
git push
```

- **Vercel** will automatically redeploy the client on every push to `main`
- **Railway** will automatically redeploy the server on every push to `main`

---

## Troubleshooting

**App shows blank page or 404 after refresh**
→ Confirm `client/vercel.json` is committed (it has the SPA rewrite rules)

**API calls fail (network error)**
→ Check `VITE_API_URL` in Vercel env vars — must include `/api/v1` and no trailing slash
→ Check `FRONTEND_URL` in Railway env vars — must match your Vercel domain exactly

**Auth redirect fails after login**
→ Make sure `https://mycarecircle.loamstrategy.com/**` is in Supabase Auth → Redirect URLs

**Emails not sending**
→ Confirm `RESEND_API_KEY` is set in Railway variables
→ Railway redeploys automatically on variable changes — check deploy logs

**SSL certificate pending**
→ Wait up to 30 minutes after DNS record is added; Vercel provisions it automatically
