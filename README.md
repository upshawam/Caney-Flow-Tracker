# Caney Flow Tracker

Phase 4 app for a mobile-first web app that tracks the Caney Fork River.

## What’s included

- `Vite + React + TypeScript` starter structure
- Mobile-first river dashboard with selectable access points
- Static `public/data/schedule.json` schedule feed used by the frontend
- Phase 2 flow engine for travel timing, overlapping waves, and computed statuses
- Phase 3 live USGS fetch for stations `03426310` and `03426250`
- Phase 4 Node-based USACE scraper and GitHub Actions refresh workflow
- Focused `vitest` coverage for the prediction engine
- Focused `vitest` coverage for the USGS response parser
- Focused `vitest` coverage for the schedule scraper/parser

## Local development

Run the app locally:

```bash
npm install
npm run scrape:schedule
npm run dev
```

## Validation

Run the engine tests and production build:

```bash
npm test
npm run build
```

## Preschedule data

The frontend now fetches `/data/schedule.json` at runtime.

- Local/generated source file: `public/data/schedule.json`
- Scraper entrypoint: `scripts/scrapeSchedule.mjs`
- Manual refresh command:

```bash
npm run scrape:schedule
```

If the generated file is unavailable, the app falls back to the bundled mock schedule so local development still works.

## Live data

The app now fetches live USGS instantaneous values directly from the browser for:

- `03426310` near Carthage
- `03426250` at Elmwood

Those readings are shown beside the predicted schedule model with timestamps and graceful fallback when the API is unavailable.

## GitHub Actions

The workflow at `.github/workflows/scrape.yml` refreshes the Center Hill preschedule on a cron schedule and commits updated `public/data/schedule.json` back to the repository.