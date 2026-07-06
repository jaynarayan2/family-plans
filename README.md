# Family Plans 📅

A simple, mobile-first shared calendar for **Reena, Mum, Dad & Jay**. Plan meals,
shopping runs, naps, mall trips, activities and trips together — vote on ideas,
confirm them, and everyone gets notified.

Live app: _(deployed on Railway — see below)_

## Features

- **4 users** (Reena, Mum, Dad, Jay) — pick who you are, no passwords.
- **Personalised opening image** every time you open the app:
  - Reena → travel landscapes 🏔️
  - Dad → super cars & space 🏎️
  - Mum → flowers 🌸
  - Jay → a mix of everyone else ✨
- **Shared & individual events** — dinners, Costco runs, naps, malls, errands, trips.
- **Voting** 👍👎 on any pending plan.
- **Pending → Confirmed** flow. Confirming notifies the whole family 🔔.
- **Fixed events** 🔒 (can't be moved/changed) vs **Movable** ↔ events, clearly marked.
- **Day view** (hour grid) and **Week view** (agenda).
- **Backlog** of ideas → **tap "Schedule" then a time**, or drag onto a day.
- **Eat** tab — pick a cuisine, get restaurant picks near home (57 Spadina Ave, Toronto).
- **Do** tab — find activities for a day/time within a chosen distance.

The Eat/Do tabs use the **Claude API** when `ANTHROPIC_API_KEY` is set, and fall back
to a curated list of real Toronto spots near home otherwise.

## Tech

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- Shared state via an atomic reducer API (`/api/action`) persisted to **Postgres**
  (`DATABASE_URL`). Without a database it uses an in-memory store (resets on restart).
- Near-real-time sync via lightweight polling.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection. Provisioned automatically on Railway. Without it, data is in-memory only. |
| `ANTHROPIC_API_KEY` | Optional. Enables live AI restaurant/activity picks. |

## Deploy

Deployed on **Railway** with a Postgres plugin. `npm run build` then `npm run start`
(Next respects the `PORT` env var). Add a Postgres service and the app auto-creates
its `app_state` table on first request.
