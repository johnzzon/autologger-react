# Autologger

A personal time-tracking tool that reads your Google Calendar events and provides one-click logging to Jira and Harvest.

Built with React 19, Vite 6, Tailwind CSS 4, Express 5, and TypeScript.

## Features

- **Daily View** — Calendar events for any date, aggregated by summary. Navigate with date buttons or keyboard shortcuts.
- **Jira Worklogs** — One-click time logging to Jira issues detected in event summaries.
- **Harvest Timers** — Integrated Harvest timer buttons with Jira title enrichment.
- **Async Jira Titles** — Jira issue titles fetched in the background with skeleton loading.
- **Flex View** — Weekly hour totals going back to 2021.
- **iCal Caching** — Calendar feed cached for 5 minutes with manual refresh.

## Keyboard Shortcuts (Daily View)

| Key | Action |
|-----|--------|
| `j` / `ArrowRight` | Next day |
| `k` / `ArrowLeft` | Previous day |
| `t` | Today |

## Setup

```bash
git clone <repo-url> && cd autologger-react
cp .env.example .env
# Fill in .env with your credentials (see below)
`npm install
npm install --prefix client
npm install --prefix server
npm run dev`
```

The client runs on `http://localhost:5173` with API requests proxied to the server on port 3001.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `APP_ICAL_LINK` | Google Calendar iCal feed URL |
| `JIRA_HOST` | Jira instance URL (e.g. `https://your-org.atlassian.net`) |
| `JIRA_USER` | Jira account email |
| `JIRA_PASS` | Jira API token |
| `HARVEST_SERVER_URL` | Harvest server URL |
| `HARVEST_USERNAME` | Harvest username |
| `HARVEST_PASSWORD` | Harvest password |

## Project Structure

```
autologger-react/
  client/             React SPA (Vite + Tailwind)
    src/
      pages/          DailyView, FlexView
      components/     Layout
  server/             Express API
    src/
      routes/         events, flex, log, harvest, jira
      lib/            events parsing, jira client
```
