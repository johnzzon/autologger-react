# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs client + server concurrently)
npm run dev

# Install dependencies (all three locations)
npm install && npm install --prefix client && npm install --prefix server

# Type-check
npx tsc --noEmit --prefix client
cd server && npx tsc --noEmit

# Build both
npm run build
```

## Architecture

Monorepo with a React SPA client and Express API server. The app reads a Google Calendar iCal feed, parses events, and provides one-click time logging to Jira.

**Client** (port 5173): React 19 + Vite 6 + Tailwind CSS 4. Vite proxies `/api/*` to the server in dev.

**Server** (port 3002): Express 5 + TypeScript. Loads `.env` from the repo root (`../`). All routes mounted under `/api`.

### Data flow

1. Server fetches iCal feed, parses VEVENTs with `node-ical`, filters by date, aggregates duplicates by `project::summary`
2. Client renders events, then async-fetches Jira titles (skeleton loading pattern)
3. Harvest platform script is dynamically injected after React renders `.harvest-timer` elements
4. Jira worklogs created via `POST /api/log` → Jira REST API v2 worklog endpoint

### Caching

- **iCal feed**: 5-min TTL in-memory cache in `server/src/lib/events.ts`. Bust with `?refresh=1` query param.
- **Jira titles**: Process-scoped Map in `server/src/lib/jira.ts`, never evicted.

### Event parsing

Regex-based extraction from calendar event summaries in `server/src/lib/events.ts`:
- Project: `^(?<project>[A-Z\s]*):` prefix
- Jira issue: `(?<jira>[A-Z\d]+-[\d]+)` anywhere in summary
- Events with identical `project::summary` keys are aggregated (durations summed)

### Key files

- `server/src/lib/events.ts` — iCal fetching, parsing, caching, aggregation (core business logic)
- `server/src/lib/jira.ts` — Jira auth, title fetching (v3 search API), worklog creation (v2 API)
- `client/src/pages/DailyView.tsx` — Main page with event table, log buttons, Harvest timers, keyboard shortcuts
- `client/src/App.tsx` — Router setup
