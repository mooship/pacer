# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cargo run          # launch the TUI
cargo test         # run all tests (28 unit + 4 integration)
cargo test --lib   # unit tests only
cargo test --lib date::tests::round_trip_common_dates  # single test by path
cargo test --test integration  # integration tests only
cargo build        # compile without running
```

## Architecture

The project is split into a **lib crate** (pure logic, testable) and a **binary crate** (TUI, not tested directly).

**Lib crate** (`src/lib.rs` re-exports):
- `date.rs` — date math with no dependencies. Uses Hinnant's proleptic Gregorian algorithm. Days are represented as `i64` days-since-1970-01-01 throughout.
- `parse.rs` — `parse_date_days` and `parse_amount`. Amount strips `R`, `,`, `_` before parsing.
- `compute.rs` — `compute(pay, end, total) -> (dates, seg_days, amounts)`. Splits a salary into a bridge payment (pay day → first Monday) plus weekly Monday allowances. Amounts are rounded to `QUANTUM` (R50); sub-quantum remainder goes to the bridge. Uses largest-remainder method for proportional allocation.

**Binary crate** (private to `src/main.rs`):
- `app.rs` — `App` struct and `Step` enum (`PayDate → LastDay → Amount → Results`). `confirm()` validates and advances; `go_back()` retreats and clears the parsed value for the step being left. `active_input()` returns `&mut String` for the current step.
- `ui.rs` — Ratatui rendering. `draw()` lays out title / form / results table / hint. The results table is hidden until `Step::Results`. `cover_end` for each row is derived as `dates[i] + seg_days[i] - 1`.
- `main.rs` — `ratatui::init()` / event loop / `ratatui::restore()`. Ctrl+C exits from any screen; `q` exits only from Results.

## Code Style

- No comments anywhere in source files.
- No single-line `if` statements or `if` expressions — every body on its own indented line. Match arms are fine on one line.
