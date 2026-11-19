# AllTrade Command v2

Phone-first follow-up, quote, and scheduling tool for a solo trades business. Built as a reusable framework: everything client specific lives in `clients/<id>.ts` and is selected with `CLIENT_ID`.

## What it does

- Today: 3 to 5 people to follow up with, each with a reason and a drafted text in the owner's voice. Text opens the SMS app prefilled. The owner sends it. Log touch takes it off the list.
- Quick quote: photos plus a voice or typed note become line items. The app does all pricing math from the hourly rate, enforces the per-visit minimum, and suggests bundling small tasks. Outputs an email draft and a text version.
- Quick schedule: books a job, adds it to Google Calendar, drafts a confirmation text.
- Jobs: mark done, mark paid (Zelle, Venmo, check, cash). Unpaid jobs feed Today with a polite nudge.
- Referral engine: thank-you plus review or referral ask 3 days after a paid job, check-ins to past customers every 60 to 90 days.
- Import customers from CSV, vCard (.vcf), or the phone contact picker (Android Chrome).

## Framework

| Piece | Where |
| --- | --- |
| Buckets, rules, voice, pricing, templates | `clients/<id>.ts` (shape in `clients/types.ts`) |
| Owner-editable overrides (rate, minimum, review link, extra voice examples) | `settings` table, Settings screen |
| Follow-up rules engine | `lib/followups.ts` |
| AI (server only, `ANTHROPIC_API_KEY`) | `lib/ai.ts` |
| Pricing math | `lib/pricing.ts` |

New client: copy `clients/burke.ts`, edit, register it in `clients/index.ts`, deploy a new Vercel project with its own database and `CLIENT_ID`.

## Setup

1. Postgres: Vercel project, Storage, create Neon database (sets `DATABASE_URL`). Tables are created automatically on first request.
2. Google OAuth client (Google Cloud console, Web application). Redirect URI: `https://<domain>/api/auth/callback/google`. Enable the Google Calendar API. Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
3. `ALLOWED_EMAILS` = the owner's Google account. Anyone else is refused at sign in.
4. `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `CLIENT_ID`.

## Dev

```
npm install
npm run dev
# logic tests against a local throwaway Postgres
DATABASE_URL=postgres://postgres@localhost:5433/alltrade npx tsx scripts/selftest.ts
```
