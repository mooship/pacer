# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Pacer is a **pnpm-workspace monorepo**. One shared core package holds all the
logic; two apps render it. Money is represented as `number` **cents** throughout.

```
packages/core   # @pacer/core — pure logic, no UI, fully tested
apps/tui        # @pacer/tui  — Ink (React for the terminal)
apps/web        # @pacer/web  — React SPA, Cloudflare Workers
```

Both apps are thin layers over `@pacer/core`; calculation logic lives only in
core so the terminal and the web stay in lock-step.

## Commands

```bash
pnpm install         # install the workspace + git hooks
pnpm test            # run every package's tests (Vitest)
pnpm typecheck       # tsc --noEmit across all packages
pnpm lint            # Biome lint + format check
pnpm build           # build core, tui, web
pnpm tui             # run the Ink app (tsx)
pnpm web             # run the Vite dev server

pnpm --filter @pacer/core test         # one package's tests
pnpm --filter @pacer/web dev           # one app
```

## Architecture

### `@pacer/core` (`packages/core/src`)

- `date.ts` — date math via Hinnant's proleptic Gregorian algorithm. Days are
  `number` days-since-1970-01-01. `today()` reads the local calendar date.
- `parse.ts` — `parseDate`, `parseDateDays`, `resolveDate` (blank/`today`/`+N`/
  `-N`/`MM-DD`/absolute), and `parseAmount` (→ cents). `MM-DD` infers the year
  relative to the base date passed in, rolling forward a year once that
  month/day has already passed. All return a `Result<T>` =
  `{ ok: true; value } | { ok: false; error }`.
- `compute.ts` — `compute(pay, end, total, boost, cfg)` → `{ dates, segDays,
  amounts }`, plus `fmtMoney`, `coverEnd`, `perDay`. Splits a salary into a
  bridge payment (pay day → first payout) plus recurring allowances rounded to
  `cfg.quantum` (default R50); the remainder and clamped `boost` go to the
  bridge. Uses the largest-remainder method.
- `config.ts` — `Config { quantum, payday, interval }`, `sanitize()`, and a Zod
  `ConfigSchema` / `parseConfig` for validating persisted config. No file/storage
  I/O (that lives in the apps).
- `csv.ts` — `buildCsv(result, total)`; shared by TUI file export and SPA
  download.
- `planner.ts` — the framework-agnostic state machine: `PlannerState`,
  `initialState`, `reducer(state, action)`, `parseSettings`, and selectors
  (`previews`, `breadcrumb`, `boostMax`). This is the shared brain of both UIs;
  persistence is performed by the apps, which then dispatch `settingsSaved`.

Every Rust-era test was ported to Vitest (`*.test.ts`) against the same
fixtures — this is the parity guarantee for the logic.

### `@pacer/tui` (`apps/tui/src`)

Ink + `ink-text-input` over the core reducer (`useReducer`). `cli.tsx` parses
`--help`/`--version` then renders `app.tsx`, which maps keys to actions and owns
config/CSV file I/O. `config-store.ts` reads/writes `config.toml` under the
platform config dir (`env-paths` + `smol-toml`). Built with `tsup` to
`dist/cli.js` (bin: `pacer`). Honors `NO_COLOR`.

### `@pacer/web` (`apps/web/src`)

Vite + React. `store.ts` is a Zustand store wrapping the core reducer and
persisting `Config` to `localStorage` (validated with Zod). Components use CSS
Modules; icons are `lucide-react`; the font is Fontsource Nunito. `App.tsx`
renders the stepped form, the results table, the boost slider, and a settings
`<dialog>`. Mobile-first and accessible (labels, `aria-live`, focus management,
keyboard support, reduced-motion). Deploys via Cloudflare Workers Static Assets
(`wrangler.jsonc`).

## Code Style

- No explanatory comments in source. `biome-ignore` pragmas are allowed where a
  rule genuinely needs suppressing.
- Formatting and linting are enforced by **Biome** and checked in CI. A
  **Lefthook** pre-commit hook runs `biome check --write` on staged files and
  re-stages them, so commits always match CI. The hook installs on `pnpm
  install`.
- TypeScript is strict (`tsconfig.base.json`); prefer `Result<T>` over throwing
  in core logic.
