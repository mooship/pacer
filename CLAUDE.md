# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
cargo run          # launch the TUI
cargo test         # run all tests (58 unit + 5 integration)
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
- `compute.rs` — `compute(pay, end, total, boost, cfg: &Config) -> (dates, seg_days, amounts)` plus `fmt_money(cents)`. Splits a salary into a bridge payment (pay day → first payout day) plus recurring allowances. Amounts are rounded to `cfg.quantum` (default R50 = 5000 cents); sub-quantum remainder and the clamped `boost` go to the bridge. The first payout lands on the next `cfg.payday` weekday and recurs every `cfg.interval` days. Uses largest-remainder method for proportional allocation.
- `config.rs` — `Config { quantum, payday, interval }` (serde). `quantum` is cents, `payday` is a weekday `0=Sun..6=Sat`, `interval` is days between payouts; defaults are R50 / Monday / 7. `sanitized()` clamps to safe ranges. `load()` reads `config.toml` under `dirs::config_dir()/pacer/` and returns `(Config, Option<String>)`: a missing file falls back to defaults silently, while an unreadable/invalid file falls back with a warning string the UI surfaces as a notice. `save()` writes `config.toml`.

**Binary crate** (private to `src/main.rs`):
- `app.rs` — `App` struct (holds the loaded `Config`) and `Step` enum (`PayDate → LastDay → Amount → Results`, plus `Settings`). `confirm()` validates and advances (rejecting periods longer than `MAX_DAYS`); `go_back()` retreats and clears the parsed value for the step being left. Tracks a `cursor` into the active field for inline editing and `today` for relative date resolution. `csv()` builds the export string (the file write lives in `main.rs`). `active_input()` returns `&mut String` for the current step. The `Settings` step edits `quantum_input` / `interval_input` and cycles `config.payday`; `save_settings()` validates, persists via `Config::save`, and returns to the prior step.
- `ui.rs` — Ratatui rendering. `draw()` lays out title / form (or settings) / results table / hint. The form renders the cursor inside the active field and a green notice / red error line. `render_settings()` draws the quantum / payout-day / interval fields. The results table (hidden until `Step::Results`) has a per-day column; `cover_end` for each row is `dates[i] + seg_days[i] - 1`.
- `main.rs` — loads `Config` (surfacing any load warning as the initial notice) then `ratatui::init()` / blocking event loop (`event::read()`) / `ratatui::restore()`. Arrow/Home/End/Delete edit the active field; `F2` opens settings from any screen. Ctrl+C exits from any screen; on Results `q` quits and `s` writes `app.csv()` to `EXPORT_PATH` (reporting the canonical path).

## Code Style

- No comments anywhere in source files.
- Formatting is enforced by `cargo fmt` (default rustfmt settings) and checked in CI. Locally, a cargo-husky pre-commit hook (`.cargo-husky/hooks/pre-commit`, installed on `cargo test`) runs `cargo fmt` and re-stages changed Rust files.
