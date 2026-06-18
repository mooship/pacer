use crate::config::Config;
use crate::date::weekday;

pub fn cover_end(date: i64, days: i64) -> i64 {
    date + days - 1
}

pub fn per_day(amount: i64, days: i64) -> i64 {
    amount / days
}

pub fn fmt_money(cents: i64) -> String {
    let neg = cents < 0;
    let cents = cents.abs();
    let rand = cents / 100;
    let frac = cents % 100;
    let digits = rand.to_string();
    let len = digits.len();
    let mut grouped = String::new();
    for (i, ch) in digits.chars().enumerate() {
        if i > 0 && (len - i).is_multiple_of(3) {
            grouped.push(',');
        }
        grouped.push(ch);
    }
    format!("{}R{}.{:02}", if neg { "-" } else { "" }, grouped, frac)
}

pub fn compute(
    pay: i64,
    end: i64,
    total: i64,
    boost: i64,
    cfg: &Config,
) -> (Vec<i64>, Vec<i64>, Vec<i64>) {
    let total_days = end - pay + 1;
    let boost = boost.clamp(0, total);
    let pool = total - boost;

    let mut dates = vec![pay];
    let to_first = match (cfg.payday - weekday(pay)).rem_euclid(7) {
        0 => cfg.interval,
        d => d,
    };
    let mut m = pay + to_first;
    while m <= end {
        dates.push(m);
        m += cfg.interval;
    }

    let n = dates.len();
    let seg_days: Vec<i64> = (0..n)
        .map(|i| {
            let next = if i + 1 < n { dates[i + 1] } else { end + 1 };
            next - dates[i]
        })
        .collect();

    let quanta = pool / cfg.quantum;
    let sub = pool % cfg.quantum;
    let mut base: Vec<i64> = seg_days
        .iter()
        .map(|&days| days * quanta / total_days)
        .collect();
    let mut fracs: Vec<(i64, usize)> = seg_days
        .iter()
        .enumerate()
        .map(|(i, &days)| (days * quanta % total_days, i))
        .collect();
    let mut leftover = quanta - base.iter().sum::<i64>();
    fracs.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    for &(_, i) in &fracs {
        if leftover == 0 {
            break;
        }
        base[i] += 1;
        leftover -= 1;
    }
    let mut amounts: Vec<i64> = base.iter().map(|q| q * cfg.quantum).collect();
    amounts[0] += sub + boost;

    (dates, seg_days, amounts)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::DEFAULT_QUANTUM;
    use crate::date::days_from_civil;

    fn cfg() -> Config {
        Config::default()
    }

    #[test]
    fn amounts_sum_to_total() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, amounts) = compute(pay, end, 500000, 0, &cfg());
        assert_eq!(amounts.iter().sum::<i64>(), 500000);
    }

    #[test]
    fn weekly_amounts_are_multiples_of_quantum() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, amounts) = compute(pay, end, 500000, 0, &cfg());
        for &a in &amounts[1..] {
            assert_eq!(
                a % DEFAULT_QUANTUM,
                0,
                "weekly amount {a} is not a multiple of {DEFAULT_QUANTUM}"
            );
        }
    }

    #[test]
    fn sub_quantum_remainder_goes_to_bridge() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, amounts) = compute(pay, end, 502500, 0, &cfg());
        for &a in &amounts[1..] {
            assert_eq!(a % DEFAULT_QUANTUM, 0);
        }
        assert_eq!(amounts.iter().sum::<i64>(), 502500);
    }

    #[test]
    fn boost_goes_to_bridge() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, base) = compute(pay, end, 500000, 0, &cfg());
        let (_, _, boosted) = compute(pay, end, 500000, 100000, &cfg());
        assert!(boosted[0] > base[0]);
        assert!(boosted[0] - base[0] <= 100000);
        let base_weekly: i64 = base[1..].iter().sum();
        let boosted_weekly: i64 = boosted[1..].iter().sum();
        assert!(boosted_weekly < base_weekly);
        assert_eq!(boosted.iter().sum::<i64>(), 500000);
        for &a in &boosted[1..] {
            assert_eq!(a % DEFAULT_QUANTUM, 0);
        }
    }

    #[test]
    fn out_of_range_boost_is_clamped() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, over) = compute(pay, end, 500000, 900000, &cfg());
        let (_, _, full) = compute(pay, end, 500000, 500000, &cfg());
        assert_eq!(over, full);
        assert_eq!(over.iter().sum::<i64>(), 500000);
        assert!(over.iter().all(|&a| a >= 0));

        let (_, _, under) = compute(pay, end, 500000, -100000, &cfg());
        let (_, _, zero) = compute(pay, end, 500000, 0, &cfg());
        assert_eq!(under, zero);
        assert!(under.iter().all(|&a| a >= 0));
    }

    #[test]
    fn boost_preserves_total_and_quantum() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (_, _, amounts) = compute(pay, end, 502500, 100000, &cfg());
        assert_eq!(amounts.iter().sum::<i64>(), 502500);
        for &a in &amounts[1..] {
            assert_eq!(a % DEFAULT_QUANTUM, 0);
        }
    }

    #[test]
    fn bridge_is_four_days_when_pay_is_thursday() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (dates, seg_days, _) = compute(pay, end, 500000, 0, &cfg());
        assert_eq!(dates[0], pay);
        assert_eq!(seg_days[0], 4);
        assert_eq!(dates[1], days_from_civil(2026, 6, 29));
    }

    #[test]
    fn bridge_is_seven_days_when_pay_is_monday() {
        let pay = days_from_civil(2026, 6, 22);
        let end = days_from_civil(2026, 7, 19);
        let (dates, seg_days, amounts) = compute(pay, end, 400000, 0, &cfg());
        assert_eq!(dates[0], pay);
        assert_eq!(seg_days[0], 7);
        assert_eq!(dates[1], pay + 7);
        assert_eq!(amounts.iter().sum::<i64>(), 400000);
    }

    #[test]
    fn single_day_cycle() {
        let pay = days_from_civil(2026, 6, 25);
        let (dates, seg_days, amounts) = compute(pay, pay, 100000, 0, &cfg());
        assert_eq!(dates.len(), 1);
        assert_eq!(seg_days[0], 1);
        assert_eq!(amounts.iter().sum::<i64>(), 100000);
    }

    #[test]
    fn fmt_money_groups_thousands_and_cents() {
        assert_eq!(fmt_money(500000), "R5,000.00");
        assert_eq!(fmt_money(502550), "R5,025.50");
        assert_eq!(fmt_money(99), "R0.99");
        assert_eq!(fmt_money(1234567), "R12,345.67");
    }

    #[test]
    fn first_payout_lands_on_configured_weekday() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let friday = Config {
            payday: 5,
            ..Config::default()
        };
        let (dates, _, _) = compute(pay, end, 500000, 0, &friday);
        assert_eq!(dates[0], pay);
        assert_eq!(weekday(dates[1]), 5);
        assert_eq!(dates[1], days_from_civil(2026, 6, 26));
    }

    #[test]
    fn interval_spaces_payouts() {
        let pay = days_from_civil(2026, 6, 22);
        let end = days_from_civil(2026, 8, 31);
        let fortnightly = Config {
            interval: 14,
            ..Config::default()
        };
        let (dates, _, amounts) = compute(pay, end, 800000, 0, &fortnightly);
        assert!(dates.len() >= 3);
        for w in dates.windows(2).skip(1) {
            assert_eq!(w[1] - w[0], 14);
        }
        assert_eq!(amounts.iter().sum::<i64>(), 800000);
        for &a in &amounts[1..] {
            assert_eq!(a % DEFAULT_QUANTUM, 0);
        }
    }

    #[test]
    fn custom_quantum_rounds_weeklies() {
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let r100 = Config {
            quantum: 10000,
            ..Config::default()
        };
        let (_, _, amounts) = compute(pay, end, 500000, 0, &r100);
        assert_eq!(amounts.iter().sum::<i64>(), 500000);
        for &a in &amounts[1..] {
            assert_eq!(a % 10000, 0);
        }
    }
}
