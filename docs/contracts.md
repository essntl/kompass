# Kompass – shared contracts

This is the single source of truth every workstream builds against. If something here
conflicts with your instinct, follow this file. If something here is impossible, stop and
report it instead of working around it.

Kompass is a prototype student app for Norwegian vocational students (yrkesfag, VG1–VG2).
It is a school project: it must run, look polished and demo well. No real auth, no real
school integrations.

## 1. Language rules

- **Everything the user can see is Norwegian Bokmål**: UI text, labels, mock data, AI answers,
  error messages, `aria-label`s, `alt` text, URL paths.
- **Everything else is English**: code, identifiers, comments, file names, test names.
- Tone of the Norwegian copy: plain and friendly, "du"-form, written for a 16-year-old.
  Short sentences. No exclamation marks in chrome, no emoji in UI text.
  Buttons are a verb (+ object): "Meld fravær", "Lagre", "Legg til oppføring".

## 2. Stack (already installed – do not change versions)

| Area | Choice |
|---|---|
| Build | Vite 8, TypeScript 7 (`strict`), React 19 |
| Routing | `react-router` 8 (data router, `createBrowserRouter`) |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite`, tokens in `src/styles/tokens.css` |
| Motion | `motion` 14 (`import { motion, AnimatePresence } from 'motion/react'`) |
| State | `zustand` 5 + `persist` (localStorage); photos in IndexedDB via `idb-keyval` |
| Icons | `lucide-react` only |
| Dates | `date-fns` 4 with the `nb` locale |
| Primitives | `@radix-ui/react-dialog`, `-slider`, `-switch`, `vaul` (bottom sheets) |
| Server | Express 5 on port 8787, `@anthropic-ai/sdk` 1.x, `zod` 4, `dotenv` |
| ICS | `ical.js` 2 |
| Tests | Vitest 5 (`*.test.ts` next to the code) |

Several of these are newer majors than you may remember. **When an API does not behave as
you expect, read the types in `node_modules/<pkg>` instead of guessing.**

Commands: `npm run dev` (Vite on 5173 + API on 8787), `npm run typecheck`, `npm test`.
Path aliases: `@/…` → `src/…`, `@shared/…` → `shared/…`.

## 3. Folder structure and ownership

```
docs/contracts.md            orchestrator
shared/types.ts              orchestrator   domain types (client + server)
shared/api.ts                orchestrator   request/response types for every route
shared/infoSources.ts        A2             curated, verified source list (client + server)
server/                      A2             Express app, Anthropic proxy, Entur proxy
  index.ts
  routes/                    one file per route group (ai.ts, entur.ts, health.ts)
  prompts/                   every prompt lives here, one file per feature
  mock/                      mock-mode answers used when the API key is missing
  lib/
public/                      A1 (manifest, icons), A3 (public/seed/**)
src/
  main.tsx                   A1
  app/                       A1   router, AppShell, navigation, theme, "Mer" page
  styles/tokens.css          orchestrator   design tokens
  styles/global.css          A1   base styles (imports tokens.css)
  components/ui/             A1   the component library (see §5)
  lib/
    cn.ts, motion.ts         A1
    api.ts, sse.ts           A2   typed client for every backend route
    date.ts, id.ts,
    photos.ts, timetable.ts  A3
  stores/
    settings.ts              orchestrator
    timetable.ts, messages.ts, portfolio.ts,
    apprenticeships.ts, actions.ts, reset.ts   A3
  data/seed/                 A3   (places.ts by orchestrator)
  features/
    dashboard/               D
    timetable/               B
    travel/                  C    (useDailyPlan.ts signature is fixed, see §7)
    settings/                C
    messages/                E
    info/                    F
    portfolio/               G1
    apprenticeships/         G2
```

**Ownership is strict.** Only edit files in the folders you own. If you need a change in
someone else's file, do not make it: describe it in your final report and the orchestrator
will apply it. The only exception is listed in your brief.

Each feature folder contains `routes.tsx` (see §6), its pages, `components/`, and any
feature-local hooks, logic and tests.

## 4. Design system

Direction: **"Nordic workwear"** – warm paper grounds, deep spruce-teal primary, hi-vis amber
as the single signal colour. Calm and flat: hairline borders, almost no shadows, generous
whitespace. Colour is spent on *content* (subjects, transport modes, status), not on chrome.
It should feel like a well-made native app, not a web template.

Tokens live in `src/styles/tokens.css`. Read that file. Summary:

- **Colour utilities** (work in light and dark automatically): `bg-bg` (page), `bg-surface`
  (cards), `bg-surface-2` (sunken/inputs), `text-ink` / `text-ink-2` (secondary) /
  `text-ink-3` (tertiary, still AA on `bg`), `border-line`, `border-line-strong`,
  `bg-primary text-primary-ink`, `bg-primary-soft text-primary-soft-ink`,
  `bg-accent text-accent-ink`, `bg-accent-soft text-accent-soft-ink`,
  and `danger` / `success` / `info` in the same `-soft` / `-soft-ink` pattern.
- **Subjects**: 8 categorical colours, `subj-1…8` with `-soft` and `-ink` variants
  (`bg-subj-3-soft text-subj-3-ink`, `bg-subj-3` for bars and dots). Tailwind cannot see
  dynamically built class names, so always go through `subjectColor(n)` from
  `@/components/ui` which returns static class names.
- **Calendar kinds**: classes use their subject colour; `absence` uses `danger`, `custom` uses
  `info`, `deadline` uses `accent` (CSS vars `--event-*`).
- **Transport modes**: `mode-foot|bus|tram|metro|rail|water|coach|bicycle|other`
  via `modeColor(mode)` from the travel feature.
- **Type**: `font-display` (Bricolage Grotesque – page titles, big numbers, the clock time on
  hero cards) and `font-sans` (Figtree – everything else). One scale:
  `text-caption` 12 · `text-small` 14 · `text-body` 16 · `text-heading` 19 · `text-title` 24 ·
  `text-display` 32 · `text-hero` 44. Times and numbers use `tabular-nums`.
- **Radius**: `rounded-sm` 8 (chips, inputs) · `rounded-md` 12 (buttons) · `rounded-lg` 16
  (cards) · `rounded-xl` 24 (sheets, hero cards) · `rounded-full`.
- **Spacing**: Tailwind's 4px scale. Page gutter 16px on mobile, 24–32px on desktop.
  Cards have 16px padding (20px for hero cards). Vertical rhythm between sections: 24px.
- **Elevation**: cards are `bg-surface border border-line` with no shadow. `shadow-2` only for
  things that float (sheets, popovers, the mobile nav), `shadow-3` for dialogs.
- **Motion tokens**: `--dur-fast` 120ms, `--dur-base` 200ms, `--dur-slow` 320ms,
  `ease-out` = `cubic-bezier(0.23, 1, 0.32, 1)`. JS presets in `@/lib/motion`.

Hard rules:

1. No raw hex colours, no arbitrary font sizes or radii in components – tokens only.
2. No violet or purple. No gradients as decoration. No glassmorphism.
3. Light and dark must both look intentional. Never hard-code `text-white` on a token
   background; use the matching `*-ink` token.
4. Minimum touch target 44×44px. Visible `:focus-visible` ring on everything focusable
   (global style provides it; do not remove outlines).
5. Text contrast AA. Never use colour as the only signal (add an icon or label).
6. Every icon-only button has an `aria-label`. Every input has a visible label.

### Motion rules

- Page transitions and the reduced-motion policy are handled by the shell
  (`<MotionConfig reducedMotion="user">` plus a CSS fallback). Pages wrap their content in
  `<Page>` and get the transition for free.
- Lists enter staggered via `<Stagger>` / `<StaggerItem>` (30–50ms apart, 8px rise, fade).
- Press feedback on every tappable element: `active:scale-[0.97]` within 100–160ms (built into
  `Button`, `IconButton`, `Card interactive`, `Chip`).
- Expand/collapse animates height with `motion` layout or `AnimatePresence`, 200–320ms,
  `ease-out`. Shared-element transitions use `layoutId`.
- Only animate `transform` and `opacity` (and layout via `motion`). Nothing loops forever
  except skeleton shimmer and loading spinners.
- Loading states are skeletons shaped like the content, not spinners, for anything that
  takes over ~300ms.
- Hover styles only where a real pointer exists (Tailwind 4's `hover:` already gates on
  `@media (hover: hover)`).

### Mobile baseline (already in global.css – do not fight it)

`100dvh` app shell, safe-area insets on the header and bottom nav, 16px inputs, no tap
highlight, `overscroll-behavior` contained on scroll areas, `touch-action: manipulation` on
controls, `user-select: none` on controls only.

## 5. Component library – `@/components/ui`

A1 builds these; everyone else imports them from the barrel `@/components/ui` and does not
re-implement them. The exact props are in the source; this is the guaranteed surface.

| Component | Purpose |
|---|---|
| `Page` | Page wrapper: max width, gutters, bottom padding for the nav, enter transition. Props: `width?: 'narrow' \| 'wide' \| 'full'`. |
| `PageHeader` | `title`, `subtitle?`, `back?: string \| true`, `actions?`. Display font. |
| `Section` | Titled block: `title`, `action?`, children. |
| `Card` | `interactive?`, `as?`, `padding?: 'none' \| 'md' \| 'lg'`, `tone?: 'default' \| 'sunken' \| 'primary' \| 'accent'`. |
| `Button` | `variant: 'primary' \| 'secondary' \| 'soft' \| 'ghost' \| 'danger'`, `size: 'sm' \| 'md' \| 'lg'`, `icon?`, `iconRight?`, `loading?`, `fullWidth?`. Also `ButtonLink` (router link with the same look). |
| `IconButton` | Icon-only, requires `label` (becomes `aria-label`). |
| `Chip`, `ChipGroup` | Filter/suggestion chips with `selected`. |
| `Badge` | `tone: 'neutral' \| 'primary' \| 'accent' \| 'danger' \| 'success' \| 'info'`. |
| `Field`, `Input`, `Textarea`, `Select` | Form controls with `label`, `hint?`, `error?`. |
| `Switch`, `Slider`, `SegmentedControl` | Toggles; `SegmentedControl` has an animated thumb. |
| `Sheet` | Bottom sheet on mobile, centred dialog on desktop. `open`, `onOpenChange`, `title`, `description?`, `footer?`. Focus trap, Esc, drag to dismiss. |
| `ConfirmDialog` | Destructive confirmation. |
| `Skeleton`, `Spinner` | Loading. `Skeleton` takes `className` for shape. |
| `EmptyState`, `ErrorState` | `icon`, `title`, `description?`, `action?`; `ErrorState` has `onRetry?`. |
| `Stagger`, `StaggerItem` | Staggered list entrance. |
| `Collapse` | Animated height expand/collapse: `open`. |
| `Avatar` | Initials avatar: `name`, `color: SubjectColor`, `size?`. |
| `Tabs` | Underlined tabs with animated indicator. |
| `Toaster`, `toast()` | Lightweight toasts: `toast.success(msg)`, `toast.error(msg)`, `toast(msg)`. |
| `DemoBadge` | Small "Demomodus" pill shown where an answer came from mock mode. |
| `subjectColor(n)` | `{ solid, soft, ink, border, softHover }` static class names for a `SubjectColor`. |
| `cn(...)` | `clsx` wrapper from `@/lib/cn`. |

Hooks from A1: `useMediaQuery(query)`, `useIsDesktop()` (≥1024px), `useAiStatus()`
(`'live' | 'mock' | 'unknown'`, from `/api/health`).

## 6. Routing and navigation

`src/app/router.tsx` builds the router from each feature's `routes.tsx`, which exports
`export const routes: RouteObject[]` (use `lazy` for pages). Feature agents own their
`routes.tsx` and may add sub-routes under their own base path.

| Path | Feature | Nav label |
|---|---|---|
| `/` | dashboard | Hjem |
| `/timeplan` | timetable | Timeplan |
| `/reise` | travel | Reise |
| `/meldinger`, `/meldinger/:threadId` | messages | Meldinger |
| `/info`, `/info/...` | info | Info-hjørnet |
| `/portefolje`, `/portefolje/:entryId` | portfolio | Portefølje |
| `/laerlingplass`, `/laerlingplass/:listingId` | apprenticeships | Lærlingplass |
| `/innstillinger` | settings | Innstillinger |
| `/mer` | app shell | Mer |

- **Mobile (<1024px):** fixed bottom navigation with five items – Hjem, Timeplan, Reise,
  Meldinger, Mer. "Mer" lists Info-hjørnet, Portefølje, Lærlingplass and Innstillinger.
  Detail pages (thread, entry, listing) show a back button in `PageHeader`.
- **Desktop (≥1024px):** left sidebar (264px) with all eight destinations and the student's
  name; content is centred with a max width.
- Unread-message badge on the Meldinger item (`src/app/useNavBadges.ts`).

## 7. State

All stores are zustand + `persist`, storage keys `kompass:<name>`. Types in `shared/types.ts`.

**`useSettingsStore`** (`@/stores/settings`) – exists, read the file. Profile, school and home
`Place`, walking speed (`WALK_PRESETS`, m/s), theme, quick links, `ARRIVAL_WINDOW`.

**`useTimetableStore`** (`@/stores/timetable`)
```ts
subjects: Subject[];
events: CalendarEvent[];           // classes, absences and custom events
addEvent(e: Omit<CalendarEvent, 'id'>): CalendarEvent;
updateEvent(id: string, patch: Partial<CalendarEvent>): void;
removeEvent(id: string): void;
/** ICS import. Replaces earlier events with source 'ics' when `replace` is true. Returns count. */
importEvents(events: Array<Omit<CalendarEvent, 'id'>>, opts?: { replace?: boolean }): number;
/** "Last inn eksempeltimeplan": (re)creates the seed classes around the current week. */
loadSampleTimetable(): void;
clearClasses(): void;
/** Finds a subject by name (case-insensitive) or creates one with the next free colour. */
ensureSubject(name: string): Subject;
```

**`useMessagesStore`** (`@/stores/messages`)
```ts
teachers: Teacher[];
threads: Thread[];
messages: Message[];
absences: AbsenceRecord[];
sendMessage(threadId: string, text: string): Message;       // from the student
receiveMessage(threadId: string, text: string): Message;    // from the teacher, unread
markThreadRead(threadId: string): void;
```

**`usePortfolioStore`** (`@/stores/portfolio`)
```ts
entries: PortfolioEntry[];
addEntry(e: Omit<PortfolioEntry, 'id' | 'createdAt'>): PortfolioEntry;
updateEntry(id: string, patch: Partial<PortfolioEntry>): void;
removeEntry(id: string): void;     // also deletes an idb photo
```

**`useApprenticeshipStore`** (`@/stores/apprenticeships`)
```ts
listings: Listing[];
savedIds: string[];
applications: Application[];
toggleSaved(id: string): void;
submitApplication(a: Omit<Application, 'id' | 'submittedAt'>): Application;
```

**Cross-store actions** (`@/stores/actions`)
```ts
/** Creates the AbsenceRecord, the calendar events (kind 'absence') and an absence-notice
 *  message in the thread of every affected teacher. Whole day → all teachers with a class
 *  that day plus the contact teacher. */
reportAbsence(input: {
  dates: ISODate[]; wholeDay: boolean; classEventIds: string[];
  reason: AbsenceReason; text?: string; source: 'form' | 'ai';
}): AbsenceRecord;
removeAbsence(id: string): void;
```
`@/stores/reset`: `resetDemoData()` restores every store to the seed.

**Derived helpers** (`@/lib/timetable`) – pure functions plus thin hooks:
`eventsOn(events, date)`, `classesOn(events, date)`, `firstClassOn`, `lastClassOn`,
`nextClass(events, now)`, `useCalendarEvents()` (timetable events **plus** saved listing
deadlines as `kind: 'deadline'`, all-day), `useNow(intervalMs)`.

**Dates** (`@/lib/date`): calendar events use `LocalDateTime` strings (`YYYY-MM-DDTHH:mm`,
Oslo wall time, parsed as local time). Entur uses ISO instants. Helpers: `toISODate`,
`toLocalDateTime`, `parseLocal`, `localToInstant`, `formatTime` ("08:15"), `formatDayLong`
("mandag 16. november"), `formatDayShort`, `relativeDay` ("i dag", "i morgen", "på fredag"),
`weekDays(date)`, `isoWeek`. Always format with the `nb` locale through these helpers.

**Photos** (`@/lib/photos`): `savePhoto(blob): Promise<string>` returns an `idb:<key>` ref,
`usePhotoUrl(ref)` resolves `asset:` and `idb:` refs to a URL, `deletePhoto(ref)`,
`fileToDownscaledJpeg(file, maxPx)` and `photoToBase64(ref)` for sending to the AI.

**Travel** (`@/features/travel/useDailyPlan`): the dashboard uses
`useDailyPlan(date): DailyPlan`. The signature in that file is fixed.

### Seed data

On first launch the app looks lived-in: demo student Sara Nilsen (VG1 Teknologi- og
industrifag, Kuben videregående skole), a realistic timetable around the *current* week
(so the dashboard always has a next class), 5 teachers with message history and one unread
message, 5 portfolio entries with images and competence descriptions, 20 fictional
apprenticeship listings with deadlines relative to today (2 already saved).
One class per week (YFF, Thursday) is at the work placement address instead of the school.

## 8. Backend API

Base path `/api` (Vite proxies to `http://localhost:8787`). Types in `shared/api.ts`.
Errors: non-2xx with `{ error: { code, message } }`, `message` in Norwegian.

| Route | Body → Response |
|---|---|
| `GET /api/health` | → `HealthResponse` |
| `POST /api/ai/absence-detect` | `AbsenceDetectRequest` → `AbsenceDetectResponse` |
| `POST /api/ai/info` | `InfoAskRequest` → SSE `StreamEvent`s (`delta`…, `sources`, `done`) |
| `POST /api/ai/portfolio/describe` | `PortfolioDescribeRequest` → `PortfolioDescribeResponse` |
| `POST /api/ai/application-text` | `ApplicationTextRequest` → SSE `StreamEvent`s (`delta`…, `done`) |
| `GET /api/entur/geocode?q=&lat=&lon=` | → `GeocodeResponse` |
| `POST /api/entur/trips` | `TripsRequest` → `TripsResponse` |

- Model: `claude-haiku-5-5` for every AI route. All prompts in `server/prompts/`.
- **Mock mode:** when `ANTHROPIC_API_KEY` is missing the AI routes still answer, with
  plausible canned/heuristic results and `mock: true`. The UI shows `DemoBadge`. The app must
  never crash or show a raw error because the key is missing.
- Entur goes through the backend only (`ET-Client-Name` header, short in-memory cache).

Client (`@/lib/api`): one typed function per route – `getHealth`, `detectAbsence`,
`streamInfoAnswer`, `describePortfolioEntry`, `streamApplicationText`, `geocode`, `planTrips`.
They throw `ApiError` (`code`, `message` in Norwegian; `code: 'NETWORK'` when offline).
Streaming functions take `{ onDelta, onSources?, signal }` and resolve with `{ mock }`.

## 9. Working rules for agents

- Do not run `git commit`, `git add`, or anything that changes git state. The orchestrator commits.
- Do not add or upgrade npm packages unless your brief says you may. If you need one, say so
  in your final report.
- Do not start servers on ports 5173 or 8787 unless your brief says you may (other agents
  work in the same folder). Verify with `npx tsc --noEmit` and `npx vitest run <your paths>`.
  Type errors in files you do not own are not yours to fix – list them in your report.
- Do not create extra docs, READMEs or planning files.
- Keep files focused: one component per file, feature logic in pure functions that can be tested.
- End with a short report: what you built, files touched, anything unfinished or uncertain,
  and any change you need in a file you do not own.
