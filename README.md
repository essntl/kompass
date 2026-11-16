# Kompass

A prototype student app for Norwegian upper-secondary vocational students (yrkesfag, VG1–VG2).
It brings the timetable, the trip to school, absence, a competence portfolio and the
apprenticeship search into one place.

This is a school project. It runs locally, uses demo data and is not production-ready:
there is no login, no real school integration, and nothing is sent to teachers or companies.
The app itself is in Norwegian Bokmål; the code and this README are in English.

## Getting started

Requires Node.js 22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. That one command starts both the web app (Vite, port 5173)
and the backend (Express, port 8787). On a phone on the same Wi-Fi, open
`http://<your-computer's-IP>:5173`.

The app starts with demo data: a student (Sara Nilsen, VG1 Teknologi- og industrifag), a
timetable around the current week, teachers with message history, portfolio entries and
20 apprenticeship listings. Everything you change is saved in the browser and survives a
reload. To start over, go to **Innstillinger → Tilbakestill demodata**.

### Adding the Anthropic API key

The AI features use Claude Haiku (`claude-haiku-5-5`) through the backend, so the key never
reaches the browser.

1. Copy `.env.example` to `.env`.
2. Set `ANTHROPIC_API_KEY=<your key>`.
3. Restart `npm run dev`.

**Without a key the app still works.** The backend falls back to a built-in mock mode that
returns plausible answers, and the UI marks them with a small "Demomodus" badge.
Innstillinger shows which mode is active.

Optional settings in `.env`: `API_PORT` (backend port, default 8787), `ANTHROPIC_MODEL`, `ENTUR_CLIENT_NAME`.

### Other commands

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests (Vitest) |
| `npm run typecheck` | Type-checks the whole project |
| `npm start` | Builds the web app and serves it from the backend on port 8787 |

## Features

| Screen | Path | What it does |
|---|---|---|
| Hjem | `/` | Next class with countdown, "Gå hjemmefra kl. …", reminders, today's classes, editable quick links |
| Timeplan | `/timeplan` | Day, week and list views with swipe; `.ics` import, manual entry, sample timetable |
| Reise | `/reise` | Daily travel plan from Entur: arrive 10–15 minutes before the first class, trip home, trips between locations, walking speed |
| Meldinger | `/meldinger` | Chat with teachers (simulated replies), "Meld fravær", AI absence detection that suggests a calendar entry |
| Info-hjørnet | `/info` | AI questions and answers with recommended sources, topic pages, an interactive education-path map, videos |
| Portefølje | `/portefolje` | Entries with photo and note, AI competence descriptions, "Lag søknadstekst" |
| Lærlingplass | `/laerlingplass` | Listings with search, filters and sorting, saved listings, a mock application flow |
| Innstillinger | `/innstillinger` | Profile, school and home address, walking speed, theme, reset demo data |

## Architecture

```
index.html, vite.config.ts     Vite entry; /api is proxied to the backend
shared/                        Code used by both sides
  types.ts                     Domain types
  api.ts                       Request/response types for every backend route
  infoSources.ts               Curated, verified source list for the info corner
server/                        Express backend
  routes/                      health, ai (Anthropic proxy), entur (Entur proxy)
  prompts/                     Every prompt, one file per feature – edit them here
  mock/                        Mock-mode answers used when there is no API key
  lib/                         Anthropic client, SSE, cache, Entur client, validation
src/
  app/                         Router, app shell (bottom nav / sidebar), theme
  components/ui/               The component library (one design system)
  styles/tokens.css            Design tokens: colour, type, radius, motion
  stores/                      Zustand stores, persisted to localStorage
  data/seed/                   Demo data, generated relative to today's date
  lib/                         API client, date, timetable, absence and photo helpers
  features/<name>/             One folder per feature: pages, components, logic, tests
docs/contracts.md              The contracts the parallel workstreams were built against
```

- **Frontend:** React 19, TypeScript, React Router, Tailwind CSS 4 and Motion for animation.
  Bottom navigation on mobile, sidebar on desktop, light and dark theme,
  `prefers-reduced-motion` respected.
- **State and persistence:** Zustand stores saved to localStorage (keys `kompass:*`).
  Portfolio photos are stored in IndexedDB because they are too large for localStorage.
- **Backend:** a small Express server with two jobs. It proxies the Anthropic API (key in
  `.env`, structured output for absence detection and competence descriptions, streaming over
  server-sent events for answers and application texts) and it proxies Entur (geocoder and
  Journey Planner v3, with a short in-memory cache and the `ET-Client-Name` header).
- **Info corner sources:** the model only gets to pick source *ids* from
  `shared/infoSources.ts`; the backend fills in titles and URLs from that list, so it cannot
  invent a link.

### API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Reports whether AI is `live` or `mock` |
| `POST /api/ai/absence-detect` | Does a chat message report absence? Returns structured JSON |
| `POST /api/ai/info` | Streams an answer, then 1–3 recommended sources |
| `POST /api/ai/portfolio/describe` | Competence description from note and photo |
| `POST /api/ai/application-text` | Streams an application draft |
| `GET /api/entur/geocode` | Address autocomplete |
| `POST /api/entur/trips` | Trip search |

## Tests

`npm test` runs about 480 unit tests. The two the project brief asked for specifically:

- Choosing the trip that arrives 10–15 minutes early:
  `src/features/travel/lib/tripSelection.test.ts`
- Parsing `.ics` files (recurrence, time zones, a Visma-style export):
  `src/features/timetable/logic/parseIcs.test.ts`

## What is mocked

- Teachers, messages and their replies (canned replies after a short delay).
- Absence notices and apprenticeship applications are stored locally; nothing is sent.
- Apprenticeship listings and companies are invented.
- Seed portfolio images are illustrations standing in for photos.
- AI answers when no API key is set.

Entur trip data and address search are real.
