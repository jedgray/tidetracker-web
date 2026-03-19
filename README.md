# TideTracker Web

Tide and current predictions for dive planning in the Puget Sound and Salish Sea.

Built with Next.js 14, Prisma, PostgreSQL, NextAuth, and Tailwind CSS. Deployed on Railway.

---

## Local development

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/tidetracker-web.git
cd tidetracker-web
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `GITHUB_ID` / `GITHUB_SECRET` | Optional — GitHub OAuth app credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional — Google OAuth credentials |

### 3. Database

Start a local Postgres instance (Docker recommended):

```bash
docker run --name tidetracker-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tidetracker -p 5432:5432 -d postgres:16
```

Push the schema and seed dive sites:

```bash
npm run db:push
npm run db:seed
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment on Railway

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select `tidetracker-web`
3. Add a **PostgreSQL** plugin to the project

Railway automatically sets `DATABASE_URL` when you add the plugin.

### 3. Set environment variables

In Railway → your service → **Variables**, add:

```
NEXTAUTH_SECRET=<your-secret>
NEXTAUTH_URL=https://<your-railway-domain>.railway.app
```

Add `GITHUB_ID` / `GITHUB_SECRET` or `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` if using OAuth.

### 4. Run migrations

In Railway → your service → **Shell**:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

Or set up a Railway deploy hook to run migrations automatically.

### 5. OAuth callback URLs

**GitHub:** `https://<your-domain>/api/auth/callback/github`
**Google:** `https://<your-domain>/api/auth/callback/google`

Add these to your OAuth app settings.

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           NextAuth + register + disclaimer
│   │   ├── dive-logs/      GET, POST, DELETE, CSV export
│   │   ├── corrections/    GET personal and community corrections
│   │   ├── community/      GET aggregates, PATCH sharing settings
│   │   ├── settings/       PATCH unit preferences
│   │   └── health/         Railway health check
│   ├── auth/               signin, signup, onboarding, error pages
│   └── dashboard/          plan, log, history, analysis, community, settings
├── components/
│   └── ui/                 SessionProvider, NavSidebar
├── lib/
│   ├── auth.ts             NextAuth config
│   ├── prisma.ts           Prisma singleton
│   ├── corrections.ts      Correction engine (recompute, get, getAll)
│   └── disclaimer.ts       Disclaimer text (single source of truth)
├── middleware.ts            Auth guard + disclaimer redirect
└── types/
    └── next-auth.d.ts      Session type augmentation
prisma/
├── schema.prisma           Database schema
└── seed.ts                 Dive site reference data
```

---

## Key design decisions

**Corrections architecture:** Personal corrections (your observations only) take precedence over community corrections. Community corrections require explicit opt-in and aggregate only anonymised delta values. Both require a minimum of 10 observations before activation.

**Disclaimer:** All users — email/password and OAuth — must accept the safety disclaimer before accessing the app. The disclaimer text lives in `src/lib/disclaimer.ts` as a single source of truth; updating it there updates sign-up, onboarding, and any future views automatically.

**Privacy default:** `shareLogsWithCommunity` defaults to `false`. Users must explicitly opt in via the Community page. Individual log sharing is a second gate (`sharedWithCommunity` per log) so users can opt in globally but still keep specific dives private.

**Station pairing:** Dive sites have a default current and tide station pairing stored in the database (seeded from `prisma/seed.ts`). Override fields (`currStationOverride`, `tideStationOverride`) are supported in the site data for cases where proximity-based pairing would be incorrect (e.g. Sunrise Beach → Colvos Passage, not The Narrows).
# tidetracker-web
