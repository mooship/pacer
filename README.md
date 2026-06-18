# pacer

Splits a monthly salary into recurring weekly allowances.

Enter your pay date, the last day your salary covers, and the total amount. pacer calculates a bridge payment from pay day to the first payout day, then equal allowances on each payout day after that. Weekly amounts are rounded to the nearest quantum (R50 by default); the sub-quantum remainder goes to the bridge.

The payout day, the interval between payouts, and the rounding quantum are all configurable — see [Settings](#settings).

The results table shows a per-day rate for each segment so you can see what you have to spend each day.

## Usage

```bash
cargo run
```

### Entering values

- **Pay date** — `YYYY-MM-DD`, or leave it blank / type `today` for today's date.
- **Last day** — `YYYY-MM-DD`, or a relative offset like `+30` (30 days after the pay date).
- **Amount** — Rand, with optional cents: `5000`, `R5,000`, or `5000.50`.

Edit fields with the arrow keys, Home/End, Backspace and Delete.

### Keys

- **Enter** — confirm   **Esc** — go back   **←/→** — move the cursor
- On the results screen: **↑/↓** move extra money into the first pay, **s** saves the plan to `pacer-budget.csv`, **q** quits.
- **F2** opens settings from any screen.
- **Ctrl+C** quits from anywhere.

## Settings

Press **F2** to open the settings screen and change:

- **Quantum** — the rounding granularity for allowances, in Rand (default R50).
- **Payout day** — the weekday each recurring allowance lands on (default Monday). Use **←/→** to cycle.
- **Every (days)** — the interval between payouts (default 7).

Use **↑/↓** to move between fields, **Enter** to save, **Esc** to cancel.

Settings are saved to `config.toml` in your platform's config directory (e.g. `~/.config/pacer/config.toml` on Linux) and loaded on every launch. The `quantum` value is stored in cents (R50 is `5000`).

## Development

A git pre-commit hook (managed by [cargo-husky](https://github.com/rhysd/cargo-husky)) runs `cargo fmt` and re-stages your changed Rust files, so commits are always formatted to match CI. The hook installs itself the first time you run `cargo test` after cloning — run it once to set things up.
