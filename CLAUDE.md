# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Pacer is a **pnpm-workspace monorepo** (`pnpm-workspace.yaml`: `packages/*`,
`apps/*`). A shared core package holds all the logic; the web app renders it.
Money is represented as `number` **minor units** throughout (cents for most
currencies, but the exponent follows the configured ISO 4217 currency — e.g.
0 for JPY, 3 for KWD, via `currencyDigits`). Dates are represented as
`number` days-since-1970-01-01 everywhere, not `Date` objects.

```
packages/core   # @pacer/core — pure logic, no UI, fully tested
apps/web        # @pacer/web  — React SPA, deployed to Cloudflare Workers
```

The web app is a thin layer over `@pacer/core`; calculation logic lives only
in core. There are no other packages — this is the entire repo (see `git ls-files`).

## Commands

```bash
pnpm install         # install the workspace + git hooks (lefthook install)
pnpm test            # run every package's tests (Vitest) — no coverage check
pnpm -r test --coverage   # same, with the 100% coverage gate CI enforces
pnpm typecheck       # pnpm -r typecheck — tsc --noEmit in both packages
pnpm lint            # biome check . — lint + format, whole repo in one pass
pnpm lint:fix        # biome check --write .
pnpm format          # biome format --write .
pnpm build           # pnpm -r build — tsc build for core, tsc --noEmit && vite build for web
pnpm web             # pnpm --filter @pacer/web dev — Vite dev server

pnpm --filter @pacer/core test         # one package's tests
pnpm --filter @pacer/core test:watch   # watch mode
pnpm --filter @pacer/web dev           # one app
pnpm --filter @pacer/web deploy        # wrangler deploy (needs `wrangler login`)
```

**`pnpm test` alone does not check coverage** — it's plain `pnpm -r test`
with no `--coverage` flag. CI's `Test` step runs `pnpm -r test --coverage`.
Validate any change with the `--coverage` form, or you can pass locally and
still fail CI.

Requires **Node >=22** (`package.json` `engines`; `.nvmrc` pins `24` as the
local dev default) and pnpm pinned via `packageManager: "pnpm@10.33.0"`. CI
(`ci.yml`) runs the full lint/typecheck/test/build matrix on **both Node 22
and 24** — a change that only works on one of those two is a CI failure, not
a pass. On a Node version below 22, pnpm prints `WARN Unsupported engine`;
every command still works, but that's a real floor now, not a harmless
mismatch to ignore.

## Architecture

### `@pacer/core` (`packages/core/src`)

The barrel `index.ts` re-exports every module below (`export * from
'./x.js'`); `apps/web` only ever imports from `@pacer/core`, never a
package-internal path.

- `date.ts` — date math via Hinnant's proleptic Gregorian algorithm
  (`daysFromCivil`/`civilFromDays`/`weekday`). `today()` reads the local
  calendar date from `new Date()`. `fmtWdDm`/`fmtWdDmy`/`fmtDmy`/`fmtIso`/
  `fmtRange` format a day-number for display; `fmtRange` collapses same-day/
  same-month/same-year spans (`"25–28 Jun"`, `"29 Jun–5 Jul"`, and a
  cross-year form with both years spelled out).
- `math.ts` — `idiv` (truncating integer division), `remEuclid` (always
  non-negative modulo — used everywhere weekday/payday arithmetic needs to
  stay positive), `clamp`.
- `constants.ts` — a single constant, `MAX_DAYS = 366`, the longest plan
  period allowed. **Not consistently reused**: `config.ts`'s `sanitize()`
  clamps `interval` to `(1, 366)` with a hardcoded literal instead of
  importing `MAX_DAYS` — if you ever change `MAX_DAYS`, grep for `366` too.
- `result.ts` — `Result<T> = Ok<T> | Err`, `ok()`, `err()`. Used instead of
  throwing across all of core's validating functions.
- `parse.ts` — `parseDate` (strict `YYYY-MM-DD`), `resolveDate` (blank/
  `today`/`+N`/`-N`/`MM-DD`/absolute `YYYY-MM-DD`, resolved relative to a
  `base` day-number — `MM-DD` rolls forward to the next occurrence on or
  after `base`, searching up to `MAX_LEAP_GAP_YEARS` (8) years ahead so a
  Feb 29 base date still resolves), and `parseAmount(s, digits?)` (→ minor
  units, `digits` defaults to 2 and should be `currencyDigits(currency)` for
  any currency-aware call site — the callers in `planner.ts` and
  `store.ts`'s settings form always pass it explicitly). All parsing returns
  `Result<T>` and rejects non-safe-integer overflow (`Number.isSafeInteger`
  guards, plus a derived `MAX_AMOUNT` bound in `parse.ts` sized so
  `compute()`'s largest-remainder math can't overflow `Number.MAX_SAFE_INTEGER`
  even at `quantum = 1`).
- `currency.ts` — `CURRENCY_CODES` (every code `Intl.supportedValuesOf('currency')`
  returns), `isCurrencyCode`, `formatterFor` (cached `Intl.NumberFormat`,
  `currencyDisplay: 'narrowSymbol'`), `currencyDigits`, `currencySymbol`,
  `currencyName`, and `REGION_CURRENCY` + `currencyForRegion` — a hand-maintained
  ISO-3166 region → principal ISO 4217 currency map (not exhaustive, but
  covers every region a browser locale is likely to report), used to guess a
  first-time visitor's currency from `Intl.Locale`.
- `config.ts` — `Config { quantum, payday, interval, currency }` with
  defaults `DEFAULT_QUANTUM = 5000`, `DEFAULT_PAYDAY = 1` (Monday — `WD[1]`),
  `DEFAULT_INTERVAL = 7`, `DEFAULT_CURRENCY = 'USD'`. `quantum` is a raw
  **minor-units integer**, not scaled by currency — switching currency in
  Settings does *not* convert the quantum's real-world value, it just
  reformats the same minor-unit integer at the new currency's decimal
  precision (see Gotchas). `sanitize()` clamps all four fields; `payday` is
  always folded into `[0, 6]` via `remEuclid`. `parseStoredConfig` (Zod,
  `z.object(fields).partial().transform(fill)`) validates persisted JSON,
  filling any missing/invalid field from defaults rather than rejecting the
  whole object. No file/storage I/O — that's `apps/web/src/store.ts`.
- `compute.ts` — `compute(pay, end, total, cfg)` → `Result<ComputeResult>`
  (`{ dates, segDays, amounts }`). The recurring payout day is
  `cfg.payday`; if `pay` already falls on that weekday the first recurring
  payout is pushed a full `cfg.interval` out (never same-day), otherwise
  it's the next occurrence of `cfg.payday`. Amounts split into `quanta =
  idiv(total, cfg.quantum)`, distributed across every segment by day-count
  via the largest-remainder method (`distribute()`), then the bridge
  segment's share is peeled back out so the *recurring* payouts stay exact
  multiples of `cfg.quantum` among themselves; the bridge absorbs whatever
  doesn't evenly divide, including the sub-quantum remainder. Also:
  `fmtMoney`/`fmtAmount` (currency-aware formatting via `currency.ts`;
  `fmtMoney` treats a string that isn't a real ISO 4217 code as a literal
  prefix rather than erroring), `coverEnd`, `perDay`, `currentSegment`,
  `nextPayout`, `barFractions` (per-row width for the results bar chart).
- `csv.ts` / `ics.ts` — `buildCsv(result, total, currency?)` and
  `buildIcs(result, total, { now, reminderHour?, currency? })`. `ics.ts`
  builds one all-day `VEVENT` + `VALARM` reminder per payout, RFC 5545
  line-folding at 75 **UTF-8 bytes** (not characters — `fold()` measures via
  `TextEncoder`) so multibyte currency symbols don't corrupt the fold.
  `now` must be passed explicitly (not read from `Date.now()`) so `DTSTAMP`
  is deterministic in tests.
- `snapshot.ts` — `PlanSnapshot { pay, last, total }`, `encodePlan` (→ `p`/
  `l`/`t` `URLSearchParams`), `decodePlan` (accepts either `URLSearchParams`
  or a plain object, validates `total > 0`, `last >= pay`, and the span
  against `MAX_DAYS`), `parsePlan` (same validation from a plain
  `{pay,last,total}` object — used for the localStorage-persisted plan),
  `examplePlan(today)` (the "See an example" seed data), `samePlan`.
- `planner.ts` — the framework-agnostic state machine: `Step` (`payDate` →
  `lastDay` → `amount` → `results`, plus a `settings` overlay step that
  remembers `settingsReturn` to go back to), `PlannerState`, `initialState`,
  `reducer(state, action)`, `parseSettings`, `saveSettingsAction` (parses
  then calls a `persist` callback, wrapping any thrown error into an
  `Action`), and selectors `previews` (per-field live preview text +
  `FieldState`), `mood`, `breadcrumb`, `planSnapshot` (non-null only once
  results are showing — including while `settings` is open with
  `settingsReturn === 'results'`). `BRIDGE_LABEL = 'Bridge'` — the shared
  label for the initial (non-recurring) payment, used by `text.ts` and
  `ics.ts` too. The app performs all persistence and then dispatches
  `settingsSaved`/`restorePlan`; `planner.ts` itself never touches
  storage or the DOM.
- `text.ts` — `summaryLine` (the plain-language pace sentence — singular
  wording when there's no recurring segment) and `buildSummaryText` (the
  full clipboard/"Copy" text: plan header, bridge line, summary line).

### `@pacer/web` (`apps/web/src`)

Vite + React 19. `store.ts` is a Zustand store wrapping the core `reducer`:

- `loadStoredConfig()` reads `localStorage['pacer.config']` (`STORAGE_KEY`)
  through `parseStoredConfig`; on **no stored config at all** (first visit),
  it detects currency from `Intl.Locale(navigator.language).maximize().region`
  → `currencyForRegion`, falling back to core's `DEFAULT_CURRENCY` when
  detection throws or fails. An *invalid* stored config (bad JSON, failed
  Zod parse) does **not** re-run detection — it silently falls back to
  `defaultConfig()` and surfaces a "stored settings were invalid" notice.
- The last `PlanSnapshot` persists to `localStorage['pacer.plan']`
  (`PLAN_KEY`) and mirrors to the URL query string via
  `window.history.replaceState` — precedence on load is **URL > localStorage**
  (`loadUrlPlan() ?? loadStoredPlan()`), so a shared link always wins over
  whatever's saved locally. `syncPlan` only writes when the snapshot
  actually changed (`samePlan`), and a write failure (e.g. storage quota) is
  surfaced as a planner `error`, not thrown.
- `ErrorBoundary.tsx` wraps `<main>` + `<SettingsDialog>`; its reset button
  clears both `STORAGE_KEY` and `PLAN_KEY` and does a full page navigation
  (`window.location.href = pathname`) rather than resetting React state —
  a crash always gets a clean reload, not a patched-up in-memory recovery.

Components (`apps/web/src/components/`) are presentational over the store:
`PlanForm` (all three fields + date/amount hints via `previews()`, quick-pick
chips, "See an example"), `Field` (label/input/hint, optional
`DatePopover`), `DatePopover` (`react-day-picker`, closes on outside
pointerdown or Escape, refocuses the trigger button), `ResultsView` (summary,
per-row bar chart, sticky-scroll table, Copy/Share/Calendar/CSV actions, a
two-click "Start over" that arms for 3s then auto-disarms), `SettingsDialog`
(native `<dialog>` via `showModal()`/`close()`, `onCancel` intercepted to
route through the reducer's `back` action instead of the browser's native
dismiss), `StatusMessage` (single `aria-live="polite"` region for error/notice),
`Mascot`. CSS Modules throughout (Vitest config sets
`css.modules.classNameStrategy: 'non-scoped'` so class-name assertions in
tests are readable); icons are `lucide-react`; font is
`@fontsource-variable/nunito` imported once in `main.tsx`. Light/dark theme
is pure CSS custom properties in `theme.css`, switched by
`prefers-color-scheme` (no JS toggle); `index.css` also handles
`prefers-reduced-motion` and a `.visually-hidden` utility.

Installable PWA via `vite-plugin-pwa` (`pwa.ts` exports `pwaOptions` used by
both `vite.config.ts` and the manifest; `registerType: 'autoUpdate'`, icons
generated at build time from `public/favicon.svg` by
`@vite-pwa/assets-generator` — the `pwa-512x512.png` referenced in
`index.html`'s `og:image`/`twitter:image` meta tags **does not exist in the
repo**, it's generated into `dist/` on build).

## Persistence & sharing — the full data flow

1. `Config` (quantum/payday/interval/currency) → `localStorage['pacer.config']`,
   Zod-validated on read, currency auto-detected only on a first-ever visit.
2. `PlanSnapshot` (pay/last/total, only 3 integers) → `localStorage['pacer.plan']`
   **and** the URL query string (`?p=...&l=...&t=...`) simultaneously, so a
   copied URL round-trips a full plan without needing storage. This is a
   *snapshot* of the three input values, not the computed schedule — the
   schedule is always recomputed from `Config` + `PlanSnapshot` via `compute()`.
3. Changing `Config` (e.g. switching payday in Settings) changes future
   schedules for the *same* stored `PlanSnapshot` — there's no snapshot of
   config history, so an old shared link always recomputes against whatever
   config the visitor currently has, not the config the sharer had.

## Deployment (Cloudflare Workers)

`apps/web/wrangler.jsonc`: static-assets Worker (`assets.directory:
"./dist"`, `not_found_handling: "single-page-application"`), custom domain
`pacer.timothybrits.co.za`, `compatibility_date: "2025-01-01"`, full
observability logging enabled (`head_sampling_rate: 1`). `pnpm --filter
@pacer/web deploy` runs `wrangler deploy`, which needs a local `wrangler
login` — this is not automated in CI; there is no deploy step in
`.github/workflows/ci.yml`.

`apps/web/public/_headers` sets a **strict CSP** on every response:
`script-src 'self'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'self'`,
`frame-ancestors 'none'`, plus `X-Frame-Options: DENY` and a locked-down
`Permissions-Policy`. Concretely: **no third-party `<script>` (no CDN
widgets, no analytics snippets, no inline `<script>` blocks) will run in
production**, even though nothing stops it from working in local dev — this
is the kind of change that looks fine on `pnpm web` and silently breaks (or
gets CSP-blocked and logged to the console) once deployed. `style-src`
allows inline styles (CSS Modules + the inline `width: %` bar-chart style in
`ResultsView.tsx` rely on this), but `script-src` does not have a matching
allowance.

## CI & PR conventions

`.github/workflows/ci.yml` defines one job (lint → typecheck → test
--coverage → build), run twice per trigger via a `strategy.matrix` over
`node-version: [22, 24]`, on push to `main`, every PR, and a weekly Saturday
cron. GitHub's check list on a PR shows more than this file defines — CodeQL,
a Semgrep Cloud Platform scan, and a Cloudflare "Workers Builds" native
integration are all configured outside this repo's `.github/`. Repo-specific
detail on triaging these, the 100%-coverage gate, and the merge convention
(real merge commits via `git log --merges`, not squash) lives in
`.claude/skills/babysit/SKILL.md` — read it before babysitting a PR here
rather than re-deriving any of this.

`.github/dependabot.yml` groups every ecosystem's updates into one PR each.
Most deps run monthly (first Saturday 09:00 Africa/Johannesburg); `wrangler`,
`vite`, and `zod` (deploy toolchain + validation boundary) are split into
their own weekly-grouped PR instead — expect occasional large,
multi-dependency Dependabot PRs rather than one-per-package.

`pnpm-workspace.yaml` restricts which dependencies' install scripts run
(`onlyBuiltDependencies: [@biomejs/biome, esbuild, lefthook, workerd]`) and
explicitly ignores `sharp`'s build script (`ignoredBuiltDependencies`, needed
transitively by `@vite-pwa/assets-generator`). **Adding a new dependency
with a postinstall/build script will silently not run it** unless added
here — pnpm approve-builds gates this by default.

The root `package.json` pins `"pnpm": { "overrides": { "esbuild@<0.28.1":
"^0.28.1" } }` — don't remove this override without checking why it was
added (a transitive esbuild version floor); Dependabot bumps around it.

## Code Style

- No explanatory comments in source. `biome-ignore` pragmas are allowed where a
  rule genuinely needs suppressing.
- Formatting and linting are enforced by **Biome** (`biome.json`: recommended
  + a11y rule presets, single quotes, trailing commas, 100-char lines) and
  checked in CI. A **Lefthook** pre-commit hook (`lefthook.yml`) runs `biome
  check --write` on staged `*.{ts,tsx,js,jsx,json,jsonc,css}` files and
  re-stages them, so a normal local commit can't drift from what CI's `pnpm
  lint` expects. The hook installs on `pnpm install` (`prepare` script).
- TypeScript is strict (`tsconfig.base.json`: `strict`, `noUnusedLocals`,
  `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`);
  prefer `Result<T>` over throwing in core logic. Core imports use explicit
  `.js` extensions (`verbatimModuleSyntax` + ESM) even though the source
  files are `.ts` — this is normal for this codebase's module setup, not a
  typo.

## Engineering Principles

Every change — feature, fix, or refactor — is expected to hold to all of the
following. These are not aspirational; coverage is enforced by CI and the
rest is enforced by review.

- **TDD.** Write the failing test first, or alongside the smallest change
  that makes it pass, then refactor. A behavior change with no test
  exercising it is not finished work.
- **100% test coverage, no exceptions.** Both `packages/core` and `apps/web`
  set `thresholds: { 100: true }` in their `vitest.config.ts`; CI runs
  `pnpm -r test --coverage` and fails the build under 100%. A branch that is
  genuinely unreachable (a type-safety guard, not a real code path) is
  documented with a one-line comment and `/* v8 ignore next [N] */` — search
  the codebase for existing examples (`store.ts`, `ResultsView.tsx`,
  `currency.ts`, `parse.ts`) before adding a new one; this is a last resort,
  never a lowered threshold, and never a test written just to pad the number
  without asserting real behavior.
- **SOLID**, with particular weight on **Open/Closed**: extend behavior by
  adding a new pure function, currency code, or reducer case rather than
  editing the branches of an already-tested function. `compute.ts`,
  `parse.ts`, and `currency.ts` are kept as small, single-purpose functions
  for exactly this reason — a new date format, currency, or export field
  should slot in beside what's there, not fork existing logic apart.
- **DRY.** Shared logic lives in `@pacer/core`, once. `apps/web` stays a thin
  rendering layer over it — the same calculation or validation appearing in
  a component as well as in core is a sign it belongs only in core. This
  codebase has been bitten by the inverse of this before: a validation
  helper (`resolveLast` in `planner.ts`) got reimplemented inline elsewhere
  to attach extra detail, and the copy quietly dropped a check the original
  had. Before adding a helper, grep `packages/core/src` for something that
  already does most of the job and extend it instead.
- **KISS.** Prefer the direct implementation over the clever one. This
  codebase favors flat `Result<T>` returns and plain functions over
  abstractions (classes, generics, indirection layers) that don't earn their
  keep. `ErrorBoundary` is the one class in the codebase, because React only
  supports error boundaries as class components.
- **YAGNI.** Don't add config knobs, parameters, or abstraction points for a
  use case nobody has asked for yet. A one-off calculation doesn't need a
  strategy pattern; a single currency format doesn't need a plugin system.
