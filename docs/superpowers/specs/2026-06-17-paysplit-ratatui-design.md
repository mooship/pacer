# paysplit — Cargo + Ratatui redesign

**Date:** 2026-06-17
**Status:** Approved

## Overview

Convert `paysplit.rs` (single-file std-only Rust script) into a proper Cargo project with a Ratatui TUI as the sole interface. The app lets the user enter their pay date, the last day the salary covers, and the total amount; it then displays a weekly breakdown table showing how much to spend each Monday (plus an initial bridge amount from pay day to the first Monday).

## Architecture

```
paysplit/
├── Cargo.toml
├── src/
│   ├── main.rs      — terminal setup/teardown, Ratatui event loop
│   ├── app.rs       — App struct, Step enum, event handling
│   ├── date.rs      — date utilities (Hinnant algorithm, formatting)
│   ├── parse.rs     — parse_date, parse_amount
│   ├── compute.rs   — compute() + QUANTUM constant
│   └── ui.rs        — draw() renders the current app state
└── tests/
    └── integration.rs — end-to-end compute scenarios
```

Each module has a single responsibility. `app.rs` is the only stateful piece; all other modules expose pure functions. `ui.rs` reads app state but never mutates it.

## App State Machine

```rust
enum Step {
    PayDate,
    LastDay,
    Amount,
    Results,
}

struct App {
    step: Step,
    pay_input: String,
    last_input: String,
    amount_input: String,
    error: Option<String>,
    pay: Option<i64>,   // set on confirmed PayDate
    last: Option<i64>,  // set on confirmed LastDay
    total: Option<i64>, // set on confirmed Amount
}
```

### Key interactions

| Key | Effect |
|-----|--------|
| Any character | Appended to the active field's buffer |
| Backspace | Removes last char from active buffer |
| Enter | Validates active field; on success advances step, on failure sets `error` |
| Esc | Goes back one step; clears parsed value for that field |
| `q` (Results screen only) | Exits the app |

`error` is cleared on the next keypress. Validation reuses `parse_date` and `parse_amount` from `parse.rs`, plus the `last >= pay` check.

## UI Layout

```
┌─────────────────────────────────────┐
│  Salary split                       │  title bar
├─────────────────────────────────────┤
│  Pay date         [ 2026-06-25 ]    │  dim if past, bold+cyan if active
│  Last day         [ 2026-07-24 ]    │  dim if past, bold+cyan if active
│  Amount           [ 5000       ]    │  dim if past, bold+cyan if active
│                                     │
│  ✗ must be on or after pay date    │  error line (red), hidden when empty
├─────────────────────────────────────┤
│  results table                      │  hidden until Step::Results
└─────────────────────────────────────┘
  Enter → confirm   Esc → back   q → quit   (hint line)
```

- All three form fields are always visible; the active field shows a cursor.
- The results table (same columns as the current CLI output: Pay / Covers / Days / Amount) is revealed when `step == Step::Results`.
- A static hint line sits at the bottom.

## Testing

### Unit tests (in-module `#[cfg(test)]`)

**`date.rs`**
- Round-trip: `days_from_civil` ↔ `civil_from_days` for known dates
- `weekday` correctness for known dates (e.g. 1970-01-01 is Thursday)
- `fmt_range` edge cases: same day, same month, cross-month

**`parse.rs`**
- Valid dates including leap-year Feb 29
- Invalid format (wrong separator, non-numeric, wrong field count)
- Out-of-range month and day
- Amount parsing: strips `R`, `,`, `_`; rejects zero and negative

**`compute.rs`**
- QUANTUM rounding: amounts are multiples of 50 except the bridge
- Sub-quantum remainder lands on the first (bridge) payment
- Sum of all amounts always equals total exactly
- Single-day cycle
- Cycle starting on a Monday (bridge covers a full 7 days; first allowance Monday is the following week)

### Integration tests (`tests/integration.rs`)

Drive full scenarios: parse inputs → `compute()` → assert:
- All amounts sum to total
- First payment date equals pay date
- Number of payments matches expected week count
- No amount is negative

No Ratatui in tests — the TUI layer is untested directly, keeping the suite fast and deterministic.

## Dependencies

```toml
[dependencies]
ratatui = "0.29"
crossterm = "0.28"

[dev-dependencies]
# none required
```

Ratatui + crossterm is the standard pairing for cross-platform TUI on stable Rust.
