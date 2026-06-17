# paysplit Ratatui Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-file `paysplit.rs` into a Cargo project with a Ratatui step-by-step TUI as the sole interface.

**Architecture:** Pure logic (date math, parsing, compute) lives in a `lib` crate so integration tests can import it. The binary crate (`main.rs`) owns the Ratatui event loop and two private modules (`app.rs` for state machine, `ui.rs` for rendering). The existing `paysplit.rs` is the source of truth for all algorithm code — port it, don't rewrite it.

**Tech Stack:** Rust stable, Ratatui 0.29, crossterm 0.28, cargo test for unit + integration tests.

---

## File Map

| File | Role |
|------|------|
| `Cargo.toml` | workspace config, dependencies |
| `src/lib.rs` | `pub mod date; pub mod parse; pub mod compute;` — testable from integration tests |
| `src/date.rs` | date utilities ported from `paysplit.rs` (Hinnant algorithm, formatting) |
| `src/parse.rs` | `parse_date`, `parse_date_days`, `parse_amount` ported from `paysplit.rs` |
| `src/compute.rs` | `QUANTUM` + `compute()` ported from `paysplit.rs` |
| `src/main.rs` | `mod app; mod ui;` — terminal init/restore, event loop |
| `src/app.rs` | `App` struct + `Step` enum + event handling methods |
| `src/ui.rs` | `draw(frame, app)` — all Ratatui widget rendering |
| `tests/integration.rs` | end-to-end `parse → compute → assert` scenarios |

---

## Task 1: Scaffold Cargo project

**Files:**
- Create: `Cargo.toml`
- Create: `src/lib.rs`
- Create: `src/main.rs`
- Create: `src/date.rs`
- Create: `src/parse.rs`
- Create: `src/compute.rs`
- Create: `src/app.rs`
- Create: `src/ui.rs`

- [ ] **Step 1: Write Cargo.toml**

```toml
[package]
name = "paysplit"
version = "0.1.0"
edition = "2021"

[[bin]]
name = "paysplit"
path = "src/main.rs"

[lib]
name = "paysplit"
path = "src/lib.rs"

[dependencies]
ratatui = "0.29"
crossterm = "0.28"
```

- [ ] **Step 2: Write src/lib.rs**

```rust
pub mod compute;
pub mod date;
pub mod parse;
```

- [ ] **Step 3: Write stub modules**

`src/date.rs`:
```rust
// date utilities — implementation in Task 2
```

`src/parse.rs`:
```rust
// parsing — implementation in Task 3
```

`src/compute.rs`:
```rust
// computation — implementation in Task 4
```

`src/app.rs`:
```rust
// app state machine — implementation in Task 6
```

`src/ui.rs`:
```rust
// ratatui rendering — implementation in Task 7
```

`src/main.rs`:
```rust
mod app;
mod ui;

fn main() {}
```

- [ ] **Step 4: Verify project builds**

Run: `cargo build`
Expected: compiles with no errors (stubs are valid empty files)

- [ ] **Step 5: Commit**

```bash
git init
git add Cargo.toml src/
git commit -m "chore: scaffold cargo project"
```

---

## Task 2: date.rs — port and test

Port date utilities verbatim from `paysplit.rs`. Add unit tests.

**Files:**
- Modify: `src/date.rs`

- [ ] **Step 1: Write the failing tests first**

Add to `src/date.rs`:

```rust
pub fn is_leap(y: i64) -> bool {
    todo!()
}

pub fn days_in_month(y: i64, m: i64) -> i64 {
    todo!()
}

pub fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    todo!()
}

pub fn civil_from_days(z0: i64) -> (i64, i64, i64) {
    todo!()
}

pub fn weekday(days: i64) -> i64 {
    todo!()
}

pub const WD: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
pub const MON: [&str; 13] = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

pub fn fmt_wd_dm(days: i64) -> String {
    todo!()
}

pub fn fmt_wd_dmy(days: i64) -> String {
    todo!()
}

pub fn fmt_dmy(days: i64) -> String {
    todo!()
}

pub fn fmt_range(start: i64, end: i64) -> String {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trip_common_dates() {
        let cases = [(2026, 6, 25), (2000, 2, 29), (1970, 1, 1), (2024, 12, 31)];
        for (y, m, d) in cases {
            assert_eq!(civil_from_days(days_from_civil(y, m, d)), (y, m, d));
        }
    }

    #[test]
    fn weekday_epoch_is_thursday() {
        // 1970-01-01 is a Thursday (index 4)
        assert_eq!(weekday(0), 4);
    }

    #[test]
    fn weekday_known_wednesday() {
        // 2026-06-17 is a Wednesday (index 3)
        assert_eq!(weekday(days_from_civil(2026, 6, 17)), 3);
    }

    #[test]
    fn weekday_known_thursday() {
        // 2026-06-25 is a Thursday (index 4)
        assert_eq!(weekday(days_from_civil(2026, 6, 25)), 4);
    }

    #[test]
    fn weekday_known_monday() {
        // 2026-06-29 is a Monday (index 1)
        assert_eq!(weekday(days_from_civil(2026, 6, 29)), 1);
    }

    #[test]
    fn fmt_range_same_day() {
        let d = days_from_civil(2026, 6, 25);
        assert_eq!(fmt_range(d, d), "25 Jun");
    }

    #[test]
    fn fmt_range_same_month() {
        let s = days_from_civil(2026, 6, 25);
        let e = days_from_civil(2026, 6, 28);
        assert_eq!(fmt_range(s, e), "25–28 Jun");
    }

    #[test]
    fn fmt_range_cross_month() {
        let s = days_from_civil(2026, 6, 29);
        let e = days_from_civil(2026, 7, 5);
        assert_eq!(fmt_range(s, e), "29 Jun–5 Jul");
    }
}
```

- [ ] **Step 2: Run tests to verify they panic (todo!)**

Run: `cargo test --lib date`
Expected: tests run but panic with "not yet implemented"

- [ ] **Step 3: Implement all date functions (port from paysplit.rs)**

Replace the `todo!()` stubs with the real implementations from `paysplit.rs`. The logic is unchanged — only `pub` is added to each function:

```rust
pub fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

pub fn days_in_month(y: i64, m: i64) -> i64 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap(y) { 29 } else { 28 },
        _ => 0,
    }
}

pub fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = (if y >= 0 { y } else { y - 399 }) / 400;
    let yoe = y - era * 400;
    let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

pub fn civil_from_days(z0: i64) -> (i64, i64, i64) {
    let z = z0 + 719468;
    let era = (if z >= 0 { z } else { z - 146096 }) / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    (if m <= 2 { y + 1 } else { y }, m, d)
}

// 0 = Sunday ... 6 = Saturday
pub fn weekday(days: i64) -> i64 {
    (((days % 7) + 4) % 7 + 7) % 7
}

pub const WD: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
pub const MON: [&str; 13] = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

pub fn fmt_wd_dm(days: i64) -> String {
    let (_, m, d) = civil_from_days(days);
    format!("{} {} {}", WD[weekday(days) as usize], d, MON[m as usize])
}

pub fn fmt_wd_dmy(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!("{} {} {} {}", WD[weekday(days) as usize], d, MON[m as usize], y)
}

pub fn fmt_dmy(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!("{} {} {}", d, MON[m as usize], y)
}

pub fn fmt_range(start: i64, end: i64) -> String {
    let (_, sm, sd) = civil_from_days(start);
    let (_, em, ed) = civil_from_days(end);
    if start == end {
        format!("{} {}", sd, MON[sm as usize])
    } else if sm == em {
        format!("{}–{} {}", sd, ed, MON[sm as usize])
    } else {
        format!("{} {}–{} {}", sd, MON[sm as usize], ed, MON[em as usize])
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --lib date`
Expected: all 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/date.rs
git commit -m "feat: add date utilities with tests"
```

---

## Task 3: parse.rs — port and test

**Files:**
- Modify: `src/parse.rs`

- [ ] **Step 1: Write the failing tests first**

```rust
use crate::date::{days_from_civil, days_in_month};

pub fn parse_date(s: &str) -> Result<(i64, i64, i64), String> {
    todo!()
}

pub fn parse_date_days(s: &str) -> Result<i64, String> {
    todo!()
}

pub fn parse_amount(s: &str) -> Result<i64, String> {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- parse_date ---

    #[test]
    fn valid_date() {
        assert_eq!(parse_date("2026-06-25"), Ok((2026, 6, 25)));
    }

    #[test]
    fn leap_year_feb_29_accepted() {
        assert!(parse_date("2000-02-29").is_ok());
    }

    #[test]
    fn non_leap_feb_29_rejected() {
        assert!(parse_date("2026-02-29").is_err());
    }

    #[test]
    fn wrong_separator_rejected() {
        assert!(parse_date("2026/06/25").is_err());
    }

    #[test]
    fn wrong_field_count_rejected() {
        assert!(parse_date("2026-06").is_err());
    }

    #[test]
    fn month_out_of_range_rejected() {
        assert!(parse_date("2026-13-01").is_err());
    }

    #[test]
    fn day_out_of_range_rejected() {
        assert!(parse_date("2026-06-31").is_err());
    }

    // --- parse_amount ---

    #[test]
    fn amount_plain_integer() {
        assert_eq!(parse_amount("5000"), Ok(5000));
    }

    #[test]
    fn amount_with_r_prefix() {
        assert_eq!(parse_amount("R5000"), Ok(5000));
    }

    #[test]
    fn amount_with_commas() {
        assert_eq!(parse_amount("5,000"), Ok(5000));
    }

    #[test]
    fn amount_with_underscores() {
        assert_eq!(parse_amount("5_000"), Ok(5000));
    }

    #[test]
    fn amount_zero_rejected() {
        assert!(parse_amount("0").is_err());
    }

    #[test]
    fn amount_negative_rejected() {
        assert!(parse_amount("-500").is_err());
    }

    #[test]
    fn amount_non_numeric_rejected() {
        assert!(parse_amount("abc").is_err());
    }
}
```

- [ ] **Step 2: Run tests to verify they panic**

Run: `cargo test --lib parse`
Expected: all tests panic with "not yet implemented"

- [ ] **Step 3: Implement parsing functions**

```rust
use crate::date::{days_from_civil, days_in_month};

pub fn parse_date(s: &str) -> Result<(i64, i64, i64), String> {
    let p: Vec<&str> = s.split('-').collect();
    if p.len() != 3 {
        return Err(format!("date must be YYYY-MM-DD, got `{}`", s));
    }
    let y: i64 = p[0].parse().map_err(|_| format!("bad year in `{}`", s))?;
    let m: i64 = p[1].parse().map_err(|_| format!("bad month in `{}`", s))?;
    let d: i64 = p[2].parse().map_err(|_| format!("bad day in `{}`", s))?;
    if !(1..=12).contains(&m) {
        return Err(format!("month out of range in `{}`", s));
    }
    if d < 1 || d > days_in_month(y, m) {
        return Err(format!("day out of range in `{}`", s));
    }
    Ok((y, m, d))
}

pub fn parse_date_days(s: &str) -> Result<i64, String> {
    let (y, m, d) = parse_date(s)?;
    Ok(days_from_civil(y, m, d))
}

pub fn parse_amount(s: &str) -> Result<i64, String> {
    let cleaned: String = s
        .chars()
        .filter(|c| !matches!(c, 'R' | 'r' | ',' | '_' | ' '))
        .collect();
    let v: i64 = cleaned
        .parse()
        .map_err(|_| format!("amount must be a whole number of Rand, got `{}`", s))?;
    if v <= 0 {
        return Err("amount must be positive".into());
    }
    Ok(v)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --lib parse`
Expected: all 13 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/parse.rs
git commit -m "feat: add parsing with tests"
```

---

## Task 4: compute.rs — port and test

**Files:**
- Modify: `src/compute.rs`

Bridge note: the bridge covers pay day up to (but not including) the first Monday. When pay day is a Thursday, the bridge is 4 days (Thu–Sun). When pay day is itself a Monday, the algorithm forces the first allowance Monday to the *following* Monday, giving the bridge a full 7 days. The bridge is never 0 days.

- [ ] **Step 1: Write the failing tests first**

```rust
pub const QUANTUM: i64 = 50;

pub fn compute(pay: i64, end: i64, total: i64) -> (Vec<i64>, Vec<i64>, Vec<i64>) {
    todo!()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::date::days_from_civil;

    #[test]
    fn amounts_sum_to_total() {
        // 2026-06-25 (Thu) to 2026-07-24, R5000
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, amounts) = compute(pay, end, 5000);
        assert_eq!(amounts.iter().sum::<i64>(), 5000);
    }

    #[test]
    fn weekly_amounts_are_multiples_of_quantum() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, amounts) = compute(pay, end, 5000);
        for &a in &amounts[1..] {
            assert_eq!(a % QUANTUM, 0, "weekly amount {a} is not a multiple of {QUANTUM}");
        }
    }

    #[test]
    fn sub_quantum_remainder_goes_to_bridge() {
        // R5025: sub-quantum = 25, must land on the bridge (amounts[0])
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, amounts) = compute(pay, end, 5025);
        for &a in &amounts[1..] {
            assert_eq!(a % QUANTUM, 0);
        }
        assert_eq!(amounts.iter().sum::<i64>(), 5025);
    }

    #[test]
    fn bridge_is_four_days_when_pay_is_thursday() {
        // 2026-06-25 is Thursday; first Monday is 2026-06-29 → bridge = 4 days
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (dates, seg_days, _) = compute(pay, end, 5000);
        assert_eq!(dates[0], pay);
        assert_eq!(seg_days[0], 4);
        // second segment starts on Monday June 29
        assert_eq!(dates[1], days_from_civil(2026, 6, 29));
    }

    #[test]
    fn bridge_is_seven_days_when_pay_is_monday() {
        // When pay is Monday the algorithm skips to the FOLLOWING Monday
        // so the bridge covers a full week (7 days)
        let pay = days_from_civil(2026, 6, 22); // Monday
        let end = days_from_civil(2026, 7, 19);
        let (dates, seg_days, amounts) = compute(pay, end, 4000);
        assert_eq!(dates[0], pay);
        assert_eq!(seg_days[0], 7);
        assert_eq!(dates[1], pay + 7);
        assert_eq!(amounts.iter().sum::<i64>(), 4000);
    }

    #[test]
    fn single_day_cycle() {
        let pay = days_from_civil(2026, 6, 25);
        let (dates, seg_days, amounts) = compute(pay, pay, 1000);
        assert_eq!(dates.len(), 1);
        assert_eq!(seg_days[0], 1);
        assert_eq!(amounts.iter().sum::<i64>(), 1000);
    }
}
```

- [ ] **Step 2: Run tests to verify they panic**

Run: `cargo test --lib compute`
Expected: all tests panic with "not yet implemented"

- [ ] **Step 3: Implement compute (port from paysplit.rs)**

```rust
use crate::date::weekday;

pub const QUANTUM: i64 = 50;

pub fn compute(pay: i64, end: i64, total: i64) -> (Vec<i64>, Vec<i64>, Vec<i64>) {
    let total_days = end - pay + 1;

    let mut dates = vec![pay];
    let to_mon = {
        let d = (1 - weekday(pay)).rem_euclid(7);
        if d == 0 { 7 } else { d }
    };
    let mut m = pay + to_mon;
    while m <= end {
        dates.push(m);
        m += 7;
    }

    let n = dates.len();
    let seg_days: Vec<i64> = (0..n)
        .map(|i| {
            let next = if i + 1 < n { dates[i + 1] } else { end + 1 };
            next - dates[i]
        })
        .collect();

    let quanta = total / QUANTUM;
    let sub = total % QUANTUM;
    let mut base: Vec<i64> = seg_days.iter().map(|&d| d * quanta / total_days).collect();
    let mut fracs: Vec<(i64, usize)> = seg_days
        .iter()
        .enumerate()
        .map(|(i, &d)| (d * quanta % total_days, i))
        .collect();
    let mut leftover = quanta - base.iter().sum::<i64>();
    fracs.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    for &(_, i) in &fracs {
        if leftover == 0 { break; }
        base[i] += 1;
        leftover -= 1;
    }
    let mut amounts: Vec<i64> = base.iter().map(|q| q * QUANTUM).collect();
    amounts[0] += sub;

    (dates, seg_days, amounts)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test --lib compute`
Expected: all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/compute.rs
git commit -m "feat: add compute with tests"
```

---

## Task 5: Integration tests

**Files:**
- Create: `tests/integration.rs`

- [ ] **Step 1: Write integration tests**

```rust
use paysplit::compute::compute;
use paysplit::parse::{parse_amount, parse_date_days};

#[test]
fn full_cycle_june_2026() {
    // Real cycle: Thu 25 Jun → Fri 24 Jul, R5000
    let pay = parse_date_days("2026-06-25").unwrap();
    let last = parse_date_days("2026-07-24").unwrap();
    let total = parse_amount("5000").unwrap();

    let (dates, seg_days, amounts) = compute(pay, last, total);

    assert_eq!(dates[0], pay, "first payment must be on pay day");
    assert_eq!(amounts.iter().sum::<i64>(), total, "amounts must sum to total");
    assert_eq!(
        seg_days.iter().sum::<i64>(),
        last - pay + 1,
        "segment days must cover the full period"
    );
    assert!(amounts.iter().all(|&a| a >= 0), "no amount may be negative");
}

#[test]
fn full_cycle_month_boundary() {
    // Cycle that spans a month boundary (Jan→Feb)
    let pay = parse_date_days("2026-01-28").unwrap();
    let last = parse_date_days("2026-02-27").unwrap();
    let total = parse_amount("R6,000").unwrap();

    let (dates, seg_days, amounts) = compute(pay, last, total);

    assert_eq!(dates[0], pay);
    assert_eq!(amounts.iter().sum::<i64>(), total);
    assert_eq!(seg_days.iter().sum::<i64>(), last - pay + 1);
    assert!(amounts.iter().all(|&a| a >= 0));
}

#[test]
fn full_cycle_short_period() {
    // Short period: only 14 days
    let pay = parse_date_days("2026-06-25").unwrap();
    let last = parse_date_days("2026-07-08").unwrap();
    let total = parse_amount("2500").unwrap();

    let (_, _, amounts) = compute(pay, last, total);

    assert_eq!(amounts.iter().sum::<i64>(), total);
    assert!(amounts.iter().all(|&a| a >= 0));
}

#[test]
fn full_cycle_exact_quantum() {
    // Total is an exact multiple of QUANTUM — no sub-quantum remainder
    let pay = parse_date_days("2026-06-25").unwrap();
    let last = parse_date_days("2026-07-24").unwrap();
    let total = parse_amount("5000").unwrap(); // 5000 / 50 = 100 quanta, remainder 0

    let (_, _, amounts) = compute(pay, last, total);

    // Every amount (including bridge) should be a multiple of QUANTUM
    for &a in &amounts {
        assert_eq!(a % 50, 0);
    }
}
```

- [ ] **Step 2: Run integration tests**

Run: `cargo test --test integration`
Expected: all 4 tests pass

- [ ] **Step 3: Commit**

```bash
git add tests/integration.rs
git commit -m "test: add integration tests"
```

---

## Task 6: app.rs — state machine

**Files:**
- Modify: `src/app.rs`

- [ ] **Step 1: Write app.rs**

```rust
use paysplit::compute::compute;
use paysplit::parse::{parse_amount, parse_date_days};

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum Step {
    PayDate,
    LastDay,
    Amount,
    Results,
}

pub struct App {
    pub step: Step,
    pub pay_input: String,
    pub last_input: String,
    pub amount_input: String,
    pub error: Option<String>,
    pub pay: Option<i64>,
    pub last: Option<i64>,
    pub total: Option<i64>,
    pub results: Option<(Vec<i64>, Vec<i64>, Vec<i64>)>,
    pub should_quit: bool,
}

impl App {
    pub fn new() -> Self {
        Self {
            step: Step::PayDate,
            pay_input: String::new(),
            last_input: String::new(),
            amount_input: String::new(),
            error: None,
            pay: None,
            last: None,
            total: None,
            results: None,
            should_quit: false,
        }
    }

    pub fn push_char(&mut self, c: char) {
        self.error = None;
        match self.step {
            Step::PayDate => self.pay_input.push(c),
            Step::LastDay => self.last_input.push(c),
            Step::Amount => self.amount_input.push(c),
            Step::Results => {}
        }
    }

    pub fn pop_char(&mut self) {
        self.error = None;
        match self.step {
            Step::PayDate => { self.pay_input.pop(); }
            Step::LastDay => { self.last_input.pop(); }
            Step::Amount => { self.amount_input.pop(); }
            Step::Results => {}
        }
    }

    pub fn confirm(&mut self) {
        self.error = None;
        match self.step {
            Step::PayDate => match parse_date_days(&self.pay_input) {
                Ok(v) => {
                    self.pay = Some(v);
                    self.step = Step::LastDay;
                }
                Err(e) => self.error = Some(e),
            },
            Step::LastDay => match parse_date_days(&self.last_input) {
                Ok(v) => {
                    if v < self.pay.unwrap() {
                        self.error = Some("must be on or after the pay date".into());
                    } else {
                        self.last = Some(v);
                        self.step = Step::Amount;
                    }
                }
                Err(e) => self.error = Some(e),
            },
            Step::Amount => match parse_amount(&self.amount_input) {
                Ok(v) => {
                    self.total = Some(v);
                    let (pay, last) = (self.pay.unwrap(), self.last.unwrap());
                    self.results = Some(compute(pay, last, v));
                    self.step = Step::Results;
                }
                Err(e) => self.error = Some(e),
            },
            Step::Results => {}
        }
    }

    pub fn go_back(&mut self) {
        self.error = None;
        match self.step {
            Step::PayDate => {}
            Step::LastDay => {
                self.pay = None;
                self.step = Step::PayDate;
            }
            Step::Amount => {
                self.last = None;
                self.step = Step::LastDay;
            }
            Step::Results => {
                self.total = None;
                self.results = None;
                self.step = Step::Amount;
            }
        }
    }

    pub fn quit(&mut self) {
        self.should_quit = true;
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cargo build`
Expected: compiles with no errors

- [ ] **Step 3: Commit**

```bash
git add src/app.rs
git commit -m "feat: add app state machine"
```

---

## Task 7: ui.rs — Ratatui rendering

**Files:**
- Modify: `src/ui.rs`

- [ ] **Step 1: Write ui.rs**

```rust
use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
};
use crate::app::{App, Step};
use paysplit::date::{fmt_range, fmt_wd_dm};

pub fn draw(frame: &mut Frame, app: &App) {
    let area = frame.area();

    let results_height: u16 = if app.step == Step::Results {
        if let Some((dates, _, _)) = &app.results {
            dates.len() as u16 + 5 // header row + total row + 3 border/padding lines
        } else {
            0
        }
    } else {
        0
    };

    let chunks = Layout::vertical([
        Constraint::Length(2),              // title + blank line
        Constraint::Length(5),              // 3 fields + blank + error
        Constraint::Length(results_height), // results table
        Constraint::Length(1),              // hint line
    ])
    .split(area);

    render_title(frame, chunks[0]);
    render_form(frame, app, chunks[1]);
    if app.step == Step::Results {
        render_results(frame, app, chunks[2]);
    }
    render_hint(frame, app, chunks[3]);
}

fn render_title(frame: &mut Frame, area: Rect) {
    let title = Paragraph::new(Line::from(vec![Span::styled(
        "Salary split",
        Style::default()
            .fg(Color::Cyan)
            .add_modifier(Modifier::BOLD),
    )]));
    frame.render_widget(title, area);
}

fn render_form(frame: &mut Frame, app: &App, area: Rect) {
    let active_style = Style::default()
        .fg(Color::Cyan)
        .add_modifier(Modifier::BOLD);
    let dim_style = Style::default().add_modifier(Modifier::DIM);

    let field = |label: &str, input: &str, is_active: bool, is_done: bool| -> Line {
        let (label_s, bracket_s, value_s) = if is_active {
            (Style::default(), active_style, active_style)
        } else if is_done {
            (dim_style, dim_style, Style::default())
        } else {
            (dim_style, dim_style, dim_style)
        };
        let cursor = if is_active { "█" } else { "" };
        Line::from(vec![
            Span::styled(format!("  {:<18}", label), label_s),
            Span::styled("[", bracket_s),
            Span::styled(format!(" {}{}", input, cursor), value_s),
            Span::styled("]", bracket_s),
        ])
    };

    let error_line = match &app.error {
        Some(e) => Line::from(Span::styled(
            format!("  ✗ {}", e),
            Style::default().fg(Color::Red),
        )),
        None => Line::from(""),
    };

    let lines = vec![
        field(
            "Pay date",
            &app.pay_input,
            app.step == Step::PayDate,
            app.pay.is_some(),
        ),
        field(
            "Last day",
            &app.last_input,
            app.step == Step::LastDay,
            app.last.is_some(),
        ),
        field(
            "Amount (R)",
            &app.amount_input,
            app.step == Step::Amount,
            app.total.is_some(),
        ),
        Line::from(""),
        error_line,
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_results(frame: &mut Frame, app: &App, area: Rect) {
    let (dates, seg_days, amounts) = match &app.results {
        Some(r) => r,
        None => return,
    };
    let last = app.last.unwrap();
    let total = app.total.unwrap();
    let total_days = last - app.pay.unwrap() + 1;

    let header = Row::new(vec![
        Cell::from("Pay"),
        Cell::from("Covers"),
        Cell::from("Days"),
        Cell::from("Amount"),
    ])
    .style(
        Style::default()
            .fg(Color::Cyan)
            .add_modifier(Modifier::BOLD),
    )
    .height(1);

    let mut rows: Vec<Row> = dates
        .iter()
        .enumerate()
        .map(|(i, &d)| {
            let cover_end = if i + 1 < dates.len() {
                dates[i + 1] - 1
            } else {
                last
            };
            let pay_style = if i == 0 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };
            Row::new(vec![
                Cell::from(fmt_wd_dm(d)).style(pay_style),
                Cell::from(fmt_range(d, cover_end)),
                Cell::from(seg_days[i].to_string()),
                Cell::from(format!("R{}", amounts[i]))
                    .style(Style::default().fg(Color::Green)),
            ])
        })
        .collect();

    rows.push(
        Row::new(vec![
            Cell::from("Total").style(Style::default().add_modifier(Modifier::BOLD)),
            Cell::from(""),
            Cell::from(total_days.to_string())
                .style(Style::default().add_modifier(Modifier::BOLD)),
            Cell::from(format!("R{}", total)).style(
                Style::default()
                    .fg(Color::Green)
                    .add_modifier(Modifier::BOLD),
            ),
        ])
        .style(Style::default().add_modifier(Modifier::BOLD)),
    );

    let widths = [
        Constraint::Length(13),
        Constraint::Length(16),
        Constraint::Length(6),
        Constraint::Length(10),
    ];

    let table = Table::new(rows, widths)
        .header(header)
        .block(Block::default().borders(Borders::ALL));

    frame.render_widget(table, area);
}

fn render_hint(frame: &mut Frame, app: &App, area: Rect) {
    let hint = if app.step == Step::Results {
        "  Esc → edit   q → quit"
    } else {
        "  Enter → confirm   Esc → back   Ctrl+C → quit"
    };
    frame.render_widget(
        Paragraph::new(Line::from(Span::styled(
            hint,
            Style::default().add_modifier(Modifier::DIM),
        ))),
        area,
    );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cargo build`
Expected: compiles with no errors

- [ ] **Step 3: Commit**

```bash
git add src/ui.rs
git commit -m "feat: add ratatui ui"
```

---

## Task 8: main.rs — event loop

**Files:**
- Modify: `src/main.rs`

- [ ] **Step 1: Write main.rs**

```rust
mod app;
mod ui;

use app::{App, Step};
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use std::io;

fn main() -> io::Result<()> {
    let mut terminal = ratatui::init();
    let result = run(&mut terminal);
    ratatui::restore();
    result
}

fn run(terminal: &mut ratatui::DefaultTerminal) -> io::Result<()> {
    let mut app = App::new();

    loop {
        terminal.draw(|frame| ui::draw(frame, &app))?;

        if event::poll(std::time::Duration::from_millis(50))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                // Ctrl+C exits from any screen
                if key.code == KeyCode::Char('c')
                    && key.modifiers.contains(KeyModifiers::CONTROL)
                {
                    break;
                }
                match key.code {
                    KeyCode::Char('q') if app.step == Step::Results => app.quit(),
                    KeyCode::Char(c) => app.push_char(c),
                    KeyCode::Backspace => app.pop_char(),
                    KeyCode::Enter => app.confirm(),
                    KeyCode::Esc => app.go_back(),
                    _ => {}
                }
            }
        }

        if app.should_quit {
            break;
        }
    }

    Ok(())
}
```

- [ ] **Step 2: Build and run**

Run: `cargo build`
Expected: compiles with no errors

Run: `cargo run`
Expected: terminal clears, "Salary split" title appears, "Pay date" field is active with a block cursor. Try entering `2026-06-25`, press Enter, enter `2026-07-24`, press Enter, enter `5000`, press Enter — results table appears. Press Esc to go back, edit an amount, confirm again. Press `q` to exit.

- [ ] **Step 3: Run all tests to confirm nothing regressed**

Run: `cargo test`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add src/main.rs
git commit -m "feat: add ratatui event loop and wire up app"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Cargo project structure with lib + bin
- ✅ Ratatui step-by-step form (PayDate → LastDay → Amount → Results)
- ✅ Allow editing (Esc goes back, clears parsed value)
- ✅ Unit tests: date.rs, parse.rs, compute.rs
- ✅ Integration tests: full parse→compute scenarios
- ✅ Bridge days correctly tested (4 days for Thursday pay, 7 for Monday pay)
- ✅ `q` exits only on Results screen; Ctrl+C exits anywhere
- ✅ No CLI args mode (Ratatui is the only interface)

**No placeholders** — all steps contain complete code.

**Type consistency** — `App`, `Step` defined in Task 6, used in Tasks 7 and 8. `compute()` returns `(Vec<i64>, Vec<i64>, Vec<i64>)` in Task 4, destructured the same way in `app.rs` (Task 6) and `ui.rs` (Task 7). `parse_date_days` / `parse_amount` signatures match across all uses.
