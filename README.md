# My CareCircle

A family caregiver coordination platform that helps multiple family members stay in sync around a shared care recipient. Powered by an AI guide called Willow who helps onboard caregivers, generate weekly summaries, and surface what matters most.

---

## Local Development

### Prerequisites
- Node.js v20+
- A Supabase project (free tier works)
- An Anthropic API key
- A Resend account (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/your-org/carecircle.git
cd carecircle

# Install root dev tools (concurrently)
npm install

# Install client dependencies
npm --prefix client install

# Install server dependencies
npm --prefix server install
```

### 2. Configure environment variables

Create `server/.env` (copy from `.env.example`):
```bash
cp .env.example server/.env
# then fill in the real values
```

Create `client/.env`:
```bash
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set up Supabase

See the [Supabase Setup](#supabase-setup) section below.

### 4. Run the app

```bash
npm run dev
```

This starts both the Vite dev server (`localhost:5173`) and the Express API (`localhost:3001`) in one terminal using `concurrently`.

Or run them separately:
```bash
npm run dev:client   # Vite on :5173
npm run dev:server   # Express on :3001
```

### 5. Verify everything works

```bash
node server/scripts/healthCheck.js
```

This checks that Supabase, Anthropic, and Resend are all correctly configured.

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration files **in order**:
   - `supabase/001_initial_schema.sql`
   - `supabase/002_add_invite_name.sql`
   - `supabase/003_add_suggested_helpers.sql`
   - `supabase/004_add_appointments.sql`
   - `supabase/005_add_documents.sql`
3. Enable **Realtime** for these tables:
   - Go to **Database → Replication**
   - Enable realtime for `log_entries` and `daily_status`
4. Set up **Storage** (for document uploads):
   - Go to **Storage → New bucket**
   - Create a bucket named `documents` (private)
5. Copy your keys from **Project Settings → API**:
   - `SUPABASE_URL` → Project URL
   - `SUPABASE_SERVICE_KEY` → `service_role` key (keep secret — server only)
   - `VITE_SUPABASE_ANON_KEY` → `anon` key (safe for the browser)

---

## Deployment

See [DEPLOY.md](./DEPLOY.md) for the full step-by-step guide.

**Summary:**
- **Client** → Vercel (set root to `client/`, framework to Vite)
- **Server** → Railway or Render (set root to `server/`, start command `node index.js`)

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Port the Express server listens on (default: `3001`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Client origin allowed by CORS (e.g. `https://carecircle.yourdomain.com`) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase `service_role` key — **never expose to the browser** |
| `ANTHROPIC_API_KEY` | Anthropic API key — used by Willow, Catch Me Up, and weekly digest |
| `RESEND_API_KEY` | Resend API key — used for invite and digest emails |
| `RESEND_FROM_EMAIL` | Sender address (e.g. `noreply@yourdomain.com`) |

### Client (`client/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base URL of the Express API (e.g. `http://localhost:3001/api/v1`) |
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase `anon` key — safe to expose in the browser |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite, React Router v7, Tailwind CSS v3 |
| Backend | Node.js 20 + Express 5 |
| Database | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Email | Resend |
| Scheduling | node-cron (weekly digest, Sundays 08:00 UTC) |
| Hosting | Vercel (client) + Railway (server) |
