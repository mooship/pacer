use pacer::compute::{compute, QUANTUM};
use pacer::parse::{parse_amount, parse_date_days};

#[test]
fn full_cycle_june_2026() {
    let pay = parse_date_days("2026-06-25").unwrap();
    let last = parse_date_days("2026-07-24").unwrap();
    let total = parse_amount("5000").unwrap();

    let (dates, seg_days, amounts) = compute(pay, last, total);

    assert_eq!(dates[0], pay, "first payment must be on pay day");
    assert_eq!(
        amounts.iter().sum::<i64>(),
        total,
        "amounts must sum to total"
    );
    assert_eq!(
        seg_days.iter().sum::<i64>(),
        last - pay + 1,
        "segment days must cover the full period"
    );
    assert!(amounts.iter().all(|&a| a >= 0), "no amount may be negative");
}

#[test]
fn full_cycle_month_boundary() {
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
    let pay = parse_date_days("2026-06-25").unwrap();
    let last = parse_date_days("2026-07-08").unwrap();
    let total = parse_amount("2500").unwrap();

    let (_, _, amounts) = compute(pay, last, total);

    assert_eq!(amounts.iter().sum::<i64>(), total);
    assert!(amounts.iter().all(|&a| a >= 0));
}

#[test]
fn full_cycle_exact_quantum() {
    let pay = parse_date_days("2026-06-25").unwrap();
    let last = parse_date_days("2026-07-24").unwrap();
    let total = parse_amount("5000").unwrap();

    let (_, _, amounts) = compute(pay, last, total);

    for &a in &amounts {
        assert_eq!(a % QUANTUM, 0);
    }
}
