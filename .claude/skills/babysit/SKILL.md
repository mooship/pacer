---
name: babysit
description: Repo-specific conventions for driving pacer pull requests to a green, mergeable state — which commands actually check what, which CI checks live outside ci.yml, the 100%-coverage gate, and how to fix things without breaking the core/web boundary. Consulted automatically when handling CI failures, merge conflicts, or review comments on a pacer PR; also load it directly whenever the user asks about this repo's CI setup, coverage requirements, or how to babysit/monitor/watch a PR here.
---

# Babysitting PRs in pacer

This file only covers what's specific to **this repo**. The general rules for
driving a PR to green (merge conflicts, CI triage order, review-comment
handling, when to ask vs. just push) come from elsewhere and still apply —
this is the layer on top: which commands to trust, which checks mean what
here, and the mistakes this codebase's structure makes easy to make.

## Commands that actually check something

```bash
pnpm lint            # biome check . — lint + format, single command for the whole repo
pnpm -r typecheck     # tsc --noEmit in both packages
pnpm -r test --coverage   # the real gate — see Coverage below
pnpm -r build         # tsc build for core, tsc --noEmit && vite build for web
```

**`pnpm test` alone does not check coverage.** It's just `pnpm -r test`,
which runs Vitest without `--coverage`. CI runs `pnpm -r test --coverage`.
If you validate a fix with plain `pnpm test` and call it done, you can push
something CI immediately rejects for coverage — always use the `--coverage`
form as your local proxy for CI, not the short one.

The Node engine in `package.json` requires `>=22`. CI runs the full job
twice per trigger, once each on Node 22 and Node 24 (`ci.yml`'s
`strategy.matrix.node-version`) — a fix that only passes on one of the two
is not done; reproduce on both before calling it green. If the environment
running these commands is on a Node below 22, pnpm prints `WARN Unsupported
engine` and that's a real floor, not something to work around.

## Coverage: 100%, no exceptions, both packages

Both `packages/core/vitest.config.ts` and `apps/web/vitest.config.ts` set
`thresholds: { 100: true }`. CI fails outright under 100% in either package
— there's no partial-credit path. When a fix drops coverage:

- The default response is to write a test for the new branch, not to trim
  the branch away or add a fallback that shouldn't exist.
- A branch that's genuinely unreachable (a type-safety guard the compiler
  needs but that can't happen at runtime given an invariant elsewhere in the
  code) can be marked with a one-line comment explaining *why* it can't
  happen, followed by `/* v8 ignore next [N] */`. Search the codebase for
  existing examples (`store.ts`, `ResultsView.tsx`) before adding a new one
  — this is a last resort, not a first move. If restructuring the code so
  the impossible state can't be represented at all removes the need for the
  guard entirely, prefer that over the ignore pragma.
- Never lower a threshold in a `vitest.config.ts` to get a PR green. If a
  change genuinely can't reach 100% (rare, and it should be rare), that's a
  question for the user, not a config edit.

## CI has more checks than `ci.yml` shows

`.github/workflows/ci.yml` defines exactly one job — "Lint, Typecheck, Test,
and Build" (lint → typecheck → test --coverage → build) — matrixed over
Node 22 and 24, so it runs twice per trigger (`Node 22` / `Node 24` in the
check list), on push to `main`, every PR, and a weekly Saturday cron. But a
PR's check list will
usually show more than that job:

- **CodeQL** ("Analyze (actions)", "Analyze (javascript-typescript)") —
  GitHub's default code-scanning setup, configured in repo settings, not a
  workflow file. A finding here is a real security signal to read and
  triage, not a flake to re-run.
- **`semgrep-cloud-platform/scan`** — an external Semgrep App integration,
  same deal: triage the finding, don't dismiss it as CI noise.
- **Workers Builds: pacer** — Cloudflare's native GitHub integration,
  building a preview deploy from the Workers dashboard config, not from
  anything in this repo's `.github/`. If it fails, it's almost always the
  same failure `pnpm build` would show locally (reproduce with that first);
  a red build here with a green local `pnpm build` is worth flagging as
  possibly Cloudflare-side rather than assumed to be the PR's fault.

None of these four are things a re-run "fixes" the way a flaky test runner
might — treat a red result from any of them as informative, not transient.

## Merge convention

This repo merges PRs with a real merge commit (`git log --merges` shows
"Merge pull request #N from ..."), not squash. Don't rebase or squash a
branch to "clean up" history before merge unless asked.

## Dependabot PRs get lighter scrutiny

Dependency-bump PRs are frequent here (check `git log --merges` — several
per month). Get CI green and skim the changelog/diff for a breaking change
worth flagging; they don't need the architectural read a feature PR gets.

## The core/web boundary is the thing most fixes get wrong

`packages/core` is pure logic — no UI, no I/O, `Result<T>` over throwing,
100% tested. `apps/web` is a thin rendering layer over it (Zustand store,
CSS Modules, React components). When fixing a CI failure or review comment:

- A calculation, validation, or piece of state logic that landed in a web
  component almost always belongs in `packages/core` instead. If a fix
  needs the same logic in two places, that's a sign it should be one
  function in core, called from both — not two implementations that can
  drift apart.
- Before adding a new helper, grep `packages/core/src` for something that
  already does most of the job (`resolveDate`, `parseAmount`, `Result<T>`,
  the `FieldState`/`previews()` pattern in `planner.ts`, `currencyDigits`,
  etc.) and extend or call it rather than writing a parallel version. This
  codebase has bitten itself on exactly this: a validation helper
  (`resolveLast`) got reimplemented inline elsewhere to attach an extra
  detail, and the copy quietly dropped a check the original had — the
  preview said a value was fine and the real validation then rejected it.
  Reuse the existing function (extend its return type if it needs to carry
  more information) rather than re-deriving its logic next to it.
- `CLAUDE.md` documents this repo's TDD/SOLID/DRY/KISS/YAGNI expectations
  and the coverage gate in more depth — read it before making a
  structural change, not just a one-line fix.

## Formatting is not a CI-failure cause worth digging into

Lefthook's pre-commit hook already runs `biome check --write` on staged
`*.{ts,tsx,js,jsx,json,jsonc,css}` files and re-stages the result, so a
normal local commit can't drift from what CI's `pnpm lint` expects. If lint
fails in CI anyway, run `pnpm lint` (or `biome check --write .` to
auto-fix) directly rather than hand-editing formatting — Biome's output is
authoritative here, don't second-guess it stylistically.
