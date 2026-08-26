# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Pacer is a **pnpm-workspace monorepo**. A shared core package holds all the
logic; the web app renders it. Money is represented as `number` **minor
units** throughout (cents for most currencies, but the exponent follows the
configured ISO 4217 currency — e.g. 0 for JPY, 3 for KWD).

```
packages/core   # @pacer/core — pure logic, no UI, fully tested
apps/web        # @pacer/web  — React SPA, Cloudflare Workers
```

The web app is a thin layer over `@pacer/core`; calculation logic lives only
in core.

## Commands

```bash
pnpm install         # install the workspace + git hooks
pnpm test            # run every package's tests (Vitest)
pnpm typecheck       # tsc --noEmit across all packages
pnpm lint            # Biome lint + format check
pnpm build           # build core, web
pnpm web             # run the Vite dev server

pnpm --filter @pacer/core test         # one package's tests
pnpm --filter @pacer/web dev           # one app
```

## Architecture

### `@pacer/core` (`packages/core/src`)

- `date.ts` — date math via Hinnant's proleptic Gregorian algorithm. Days are
  `number` days-since-1970-01-01. `today()` reads the local calendar date.
- `parse.ts` — `parseDate`, `parseDateDays`, `resolveDate` (blank/`today`/`+N`/
  `-N`/`MM-DD`/absolute), and `parseAmount(s, digits?)` (→ minor units, default
  2 decimal places). `MM-DD` infers the year relative to the base date passed
  in, rolling forward a year once that month/day has already passed. All
  return a `Result<T>` = `{ ok: true; value } | { ok: false; error }`.
- `compute.ts` — `compute(pay, end, total, cfg)` → `{ dates, segDays,
  amounts }`, plus `fmtMoney(units, currency?)`, `fmtAmount(units, currency?)`
  (a plain, symbol-less grouped number for editable round-trip fields),
  `coverEnd`, `perDay`, and `currentSegment(result, today)` (the index of the
  segment covering `today`, or `null`). Splits a salary into an initial
  payment (pay day → first payout) plus recurring allowances rounded to
  `cfg.quantum` (default R50); the remainder goes to the initial payment.
  Uses the largest-remainder method.
- `currency.ts` — `CURRENCY_CODES` (every ISO 4217 code Intl supports),
  `isCurrencyCode`, `currencyDigits` (minor-unit exponent per currency, e.g. 0
  for JPY, 3 for KWD), `currencySymbol`, `currencyName`, and
  `currencyForRegion` (a pure ISO-3166 region → likely ISO 4217 currency
  lookup, used to detect a visitor's currency from their locale). `fmtMoney`
  and `fmtAmount` use `currencyDigits`/friends to format each currency with
  its own symbol, decimal places, and grouping via `Intl.NumberFormat`,
  instead of a hardcoded 2-decimal, comma-grouped format.
- `config.ts` — `Config { quantum, payday, interval, currency }`, `sanitize()`,
  and `parseStoredConfig` (Zod-validated) for validating persisted config.
  `currency` is an ISO 4217 code (default `USD`); invalid or unrecognized
  codes fall back to the default. The web app detects the visitor's likely
  currency from their locale on first visit (see `currencyForRegion` below)
  rather than relying on this fallback. No file/storage I/O (that lives in
  the app).
- `csv.ts` — `buildCsv(result, total)`; used for the SPA's CSV download.
- `ics.ts` — `buildIcs(result, total, { now })`; an RFC 5545 calendar (one
  all-day `VEVENT` + reminder `VALARM` per payout). Used for the SPA's
  calendar download. Pass a fixed `now` in tests for deterministic
  `DTSTAMP`s.
- `snapshot.ts` — `PlanSnapshot { pay, last, total }` plus `encodePlan`
  (→ `p/l/t` query string) and `decodePlan` (validated `Result<PlanSnapshot>`,
  same guards as the reducer). Powers plan persistence and shareable URLs.
- `planner.ts` — the framework-agnostic state machine: `PlannerState`,
  `initialState`, `reducer(state, action)`, `parseSettings`, and selectors
  (`previews`, `breadcrumb`, `planSnapshot`). Persistence is performed by the
  app, which then dispatches `settingsSaved`. `restorePlan` rehydrates a
  `PlanSnapshot` straight to results.

Every Rust-era test was ported to Vitest (`*.test.ts`) against the same
fixtures — this is the parity guarantee for the logic.

### `@pacer/web` (`apps/web/src`)

Vite + React. `store.ts` is a Zustand store wrapping the core reducer and
persisting `Config` to `localStorage` (validated with Zod). On a first visit
with no stored config, it detects the visitor's currency from their browser
locale (`Intl.Locale` region → `currencyForRegion`), falling back to the core
default when detection fails. It also persists the
last `PlanSnapshot` (key `pacer.plan`) and mirrors it to the URL query string, so
plans survive reloads and are shareable/bookmarkable (precedence: URL >
localStorage); `restorePlan` rehydrates on load. Components use CSS Modules;
icons are `lucide-react`; the font is Fontsource Nunito. `App.tsx` renders the
single-screen plan form (all fields editable at once, one submit), the results
table, and a settings `<dialog>`;
results offer Copy / Share / Calendar / CSV. Mobile-first and accessible (labels,
`aria-live`, focus management, keyboard support, reduced-motion). Installable PWA
via `vite-plugin-pwa` (autoUpdate service worker, manifest, icons generated from
`public/favicon.svg`) — fully offline-capable. Deploys via Cloudflare Workers
Static Assets (`wrangler.jsonc`).

## Code Style

- No explanatory comments in source. `biome-ignore` pragmas are allowed where a
  rule genuinely needs suppressing.
- Formatting and linting are enforced by **Biome** and checked in CI. A
  **Lefthook** pre-commit hook runs `biome check --write` on staged files and
  re-stages them, so commits always match CI. The hook installs on `pnpm
  install`.
- TypeScript is strict (`tsconfig.base.json`); prefer `Result<T>` over throwing
  in core logic.
