# pacer

Splits a monthly salary into weekly Monday allowances.

Enter your pay date, the last day your salary covers, and the total amount. pacer calculates a bridge payment from pay day to the first Monday, then equal weekly allowances every Monday after that. Weekly amounts are rounded to the nearest R50; the sub-R50 remainder goes to the bridge.

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
- **Ctrl+C** quits from anywhere.
