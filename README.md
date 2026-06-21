# pacer

Splits a monthly salary into a bridge payment plus recurring allowances (weekly
by default).

Enter your pay date, the last day your salary covers, and the total amount. Pacer
calculates a bridge payment from pay day to the first payout day, then equal
allowances on each payout day after that. Allowance amounts are rounded to the
nearest quantum (R50 by default); the sub-quantum remainder rides on the bridge.

Pacer ships as a **monorepo** with two front-ends over one shared core:

- **`@pacer/core`** — pure, framework-agnostic logic (date math, parsing, the
  allocation algorithm, CSV export, and the step/boost/settings state machine),
  fully unit-tested.
- **`@pacer/tui`** — an [Ink](https://github.com/vadimdemedes/ink) terminal app.
- **`@pacer/web`** — a React single-page app, deployable to Cloudflare Workers.

Both UIs are thin layers over `@pacer/core`, so the calculation behaves
identically on the terminal and the web.

## Layout

```
packages/core   # shared logic (@pacer/core)
apps/tui        # Ink terminal UI (@pacer/tui)
apps/web        # React SPA (@pacer/web)
```

## Getting started

Requires Node 24+ and [pnpm](https://pnpm.io).

```bash
pnpm install         # install the workspace
pnpm tui             # run the terminal app
pnpm web             # run the web app (Vite dev server)
pnpm test            # run every package's tests
pnpm lint            # Biome lint + format check
pnpm typecheck       # type-check every package
pnpm build           # build core, tui, and web
```

### Terminal app

```bash
pnpm --filter @pacer/tui build
node apps/tui/dist/cli.js            # or `pacer` once linked
node apps/tui/dist/cli.js --help
```

- **Pay date** — `YYYY-MM-DD`, `MM-DD` (year inferred), or leave it blank / type `today`.
- **Last day** — `YYYY-MM-DD`, `MM-DD` (year inferred), or a relative offset like `+30`.
- **Amount** — Rand, with optional cents: `5000`, `R5,000`, or `5000.50`.

Keys: **Enter** confirm · **Esc** back · **←/→** move cursor · **F2** settings ·
**Ctrl+C** quit. On results: **↑/↓** move money into the bridge, **PgUp/PgDn**
×10, **Home/End** min/max, **s** save CSV, **i** save calendar, **c** copy,
**r** start over, **Esc** edit, **q** quit. Set `NO_COLOR` to disable colour.

### Web app

```bash
pnpm --filter @pacer/web dev        # local dev server
pnpm --filter @pacer/web build      # production build to apps/web/dist
pnpm --filter @pacer/web deploy     # deploy to Cloudflare Workers (needs auth)
```

Mobile-first, keyboard-accessible, with a light/dark "sunny" theme. Settings
(quantum, payout day, interval, and currency symbol) and the plan are stored in
`localStorage`; the schedule exports as a CSV download. Results lead with a
plain-language pace, a per-segment bar, and a "today" marker.

Deployment uses [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
(see `apps/web/wrangler.jsonc`) — `wrangler deploy` serves the built `dist` with
a single-page-app fallback. You need a Cloudflare account and `wrangler login`.

## Development

Formatting and linting are handled by [Biome](https://biomejs.dev); a
[Lefthook](https://github.com/evilmartians/lefthook) pre-commit hook runs
`biome check --write` on staged files so commits match CI. The hook installs
itself on `pnpm install`.
