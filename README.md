# pacer

Splits a monthly salary into a first payment plus recurring allowances (weekly
by default).

Enter your pay date, the last day your salary covers, and the total amount. Pacer
calculates an initial payment from pay day to the first payout day, then equal
allowances on each payout day after that. Allowance amounts are rounded to the
nearest quantum (50 units by default); the sub-quantum remainder rides on the
first payment. Any ISO 4217 currency is supported — amounts are formatted with
each currency's own symbol, decimal places, and grouping, and the currency is
auto-detected from your browser locale on first visit.

Pacer ships as a **monorepo**: a web front-end over one shared core.

- **`@pacer/core`** — pure, framework-agnostic logic (date math, parsing, the
  allocation algorithm, CSV/calendar export, and the step/settings state
  machine), fully unit-tested.
- **`@pacer/web`** — a React single-page app, deployable to Cloudflare Workers.

The web app is a thin layer over `@pacer/core`; all calculation logic lives
there.

## Layout

```
packages/core   # shared logic (@pacer/core)
apps/web        # React SPA (@pacer/web)
```

## Getting started

Requires Node 22+ (Node 24 is used for local dev, see `.nvmrc`) and
[pnpm](https://pnpm.io) (pinned to 10.33.0 via `packageManager`).

```bash
pnpm install         # install the workspace (also installs the Lefthook git hooks)
pnpm web             # run the web app (Vite dev server)
pnpm test            # run every package's tests
pnpm lint            # Biome lint + format check
pnpm typecheck       # type-check every package
pnpm build           # build core and web
```

`pnpm test` runs the suites without a coverage check; CI runs `pnpm -r test
--coverage` and enforces 100% coverage on both packages.

### Web app

```bash
pnpm --filter @pacer/web dev        # local dev server
pnpm --filter @pacer/web build      # production build to apps/web/dist
pnpm --filter @pacer/web deploy     # deploy to Cloudflare Workers (needs auth)
```

Mobile-first, keyboard-accessible, installable as a PWA, with a light/dark
theme that follows your OS preference (no manual toggle). Settings (quantum,
payout day, interval, and currency) persist to `localStorage`; the current
plan persists there too and mirrors to the URL's query string, so a copied
link reopens the same plan without needing storage. Results lead with a
plain-language pace, a per-segment bar, and a "today" marker, with actions to
copy the summary, copy a shareable link, add the schedule to your calendar
(.ics), or download it as CSV.

Deployment uses [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
(see `apps/web/wrangler.jsonc`) — `wrangler deploy` serves the built `dist` with
a single-page-app fallback. You need a Cloudflare account and `wrangler login`.

## Development

Formatting and linting are handled by [Biome](https://biomejs.dev); a
[Lefthook](https://github.com/evilmartians/lefthook) pre-commit hook runs
`biome check --write` on staged files so commits match CI. The hook installs
itself on `pnpm install`.
