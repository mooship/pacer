# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cargo run          # launch the TUI
cargo test         # run all tests (48 unit + 5 integration)
cargo test --lib   # unit tests only
cargo test --lib date::tests::round_trip_common_dates  # single test by path
cargo test --test integration  # integration tests only
cargo build        # compile without running
```

## Architecture

The project is split into a **lib crate** (pure logic, testable) and a **binary crate** (TUI; `app.rs` carries its own unit tests).

All money is represented as `i64` **cents** throughout `compute`, `app`, and the parsed total.

**Lib crate** (`src/lib.rs` re-exports):
- `date.rs` — date math using Hinnant's proleptic Gregorian algorithm. Days are represented as `i64` days-since-1970-01-01 throughout. `today()` reads the local calendar date via `chrono::Local`, then converts it with `days_from_civil`; the rest of the module has no dependencies.
- `parse.rs` — `parse_date_days`, `resolve_date` (handles blank/`today`/`+N`/`-N` relative to a base day, else an absolute date), and `parse_amount` (strips `R`/`,`/`_`/spaces, accepts up to 2 decimal places, returns cents).
- `compute.rs` — `compute(pay, end, total, boost) -> (dates, seg_days, amounts)` plus `fmt_money(cents)`. Splits a salary into a bridge payment (pay day → first Monday) plus weekly Monday allowances. Amounts are rounded to `QUANTUM` (R50 = 5000 cents); sub-quantum remainder and the clamped `boost` go to the bridge. Uses largest-remainder method for proportional allocation.

**Binary crate** (private to `src/main.rs`):
- `app.rs` — `App` struct and `Step` enum (`PayDate → LastDay → Amount → Results`). `confirm()` validates and advances; `go_back()` retreats and clears the parsed value for the step being left. Tracks a `cursor` into the active field for inline editing, `today` for relative date resolution, and a `notice` for the CSV `export()`. `active_input()` returns `&mut String` for the current step.
- `ui.rs` — Ratatui rendering. `draw()` lays out title / form / results table / hint. The form renders the cursor inside the active field and a green notice / red error line. The results table (hidden until `Step::Results`) has a per-day column; `cover_end` for each row is `dates[i] + seg_days[i] - 1`.
- `main.rs` — `ratatui::init()` / event loop / `ratatui::restore()`. Arrow/Home/End/Delete edit the active field. Ctrl+C exits from any screen; on Results `q` quits and `s` saves a CSV.

## Code Style

- No comments anywhere in source files.
- Formatting is enforced by `cargo fmt` (default rustfmt settings) and checked in CI.
