use crate::date::weekday;

pub const QUANTUM: i64 = 50;

pub fn compute(pay: i64, end: i64, total: i64) -> (Vec<i64>, Vec<i64>, Vec<i64>) {
    let total_days = end - pay + 1;

    let mut dates = vec![pay];
    let d = (1 - weekday(pay)).rem_euclid(7);
    let to_mon = if d == 0 {
        7
    } else {
        d
    };
    let mut m = pay + to_mon;
    while m <= end {
        dates.push(m);
        m += 7;
    }

    let n = dates.len();
    let seg_days: Vec<i64> = (0..n)
        .map(|i| {
            let next = if i + 1 < n {
                dates[i + 1]
            } else {
                end + 1
            };
            next - dates[i]
        })
        .collect();

    let quanta = total / QUANTUM;
    let sub = total % QUANTUM;
    let mut base: Vec<i64> = seg_days.iter().map(|&days| days * quanta / total_days).collect();
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
    let mut amounts: Vec<i64> = base.iter().map(|q| q * QUANTUM).collect();
    amounts[0] += sub;

    (dates, seg_days, amounts)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::date::days_from_civil;

    #[test]
    fn amounts_sum_to_total() {
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
        let pay = days_from_civil(2026, 6, 25);
        let end = days_from_civil(2026, 7, 24);
        let (dates, seg_days, _) = compute(pay, end, 5000);
        assert_eq!(dates[0], pay);
        assert_eq!(seg_days[0], 4);
        assert_eq!(dates[1], days_from_civil(2026, 6, 29));
    }

    #[test]
    fn bridge_is_seven_days_when_pay_is_monday() {
        let pay = days_from_civil(2026, 6, 22);
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
