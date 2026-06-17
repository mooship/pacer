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

pub fn resolve_date(s: &str, base: i64) -> Result<i64, String> {
    let t = s.trim();
    if t.is_empty() || t.eq_ignore_ascii_case("today") {
        return Ok(base);
    }
    if t.starts_with(['+', '-']) {
        let n: i64 = t
            .parse()
            .map_err(|_| format!("bad day offset in `{}`", s))?;
        return Ok(base + n);
    }
    parse_date_days(t)
}

pub fn parse_amount(s: &str) -> Result<i64, String> {
    let t = s.trim();
    let t = t.strip_prefix(['R', 'r']).unwrap_or(t).trim_start();
    let mut parts = t.splitn(2, '.');
    let int_raw = parts.next().unwrap_or("");
    let frac_raw = parts.next();
    let int_clean: String = int_raw
        .chars()
        .filter(|c| !matches!(c, ',' | '_' | ' '))
        .collect();
    if int_clean.is_empty() || !int_clean.chars().all(|c| c.is_ascii_digit()) {
        return Err(format!("amount must be a number of Rand, got `{}`", s));
    }
    let rand: i64 = int_clean
        .parse()
        .map_err(|_| format!("amount is too large, got `{}`", s))?;
    let cents = match frac_raw {
        None => 0,
        Some(f) => {
            if f.is_empty() || f.len() > 2 || !f.chars().all(|c| c.is_ascii_digit()) {
                return Err(format!(
                    "amount can have at most 2 decimal places, got `{}`",
                    s
                ));
            }
            format!("{:0<2}", f).parse().unwrap()
        }
    };
    let total = rand
        .checked_mul(100)
        .and_then(|r| r.checked_add(cents))
        .ok_or_else(|| format!("amount is too large, got `{}`", s))?;
    if total <= 0 {
        return Err("amount must be positive".into());
    }
    Ok(total)
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn amount_plain_integer() {
        assert_eq!(parse_amount("5000"), Ok(500000));
    }

    #[test]
    fn amount_with_r_prefix() {
        assert_eq!(parse_amount("R5000"), Ok(500000));
    }

    #[test]
    fn amount_with_commas() {
        assert_eq!(parse_amount("5,000"), Ok(500000));
    }

    #[test]
    fn amount_with_underscores() {
        assert_eq!(parse_amount("5_000"), Ok(500000));
    }

    #[test]
    fn amount_with_cents() {
        assert_eq!(parse_amount("5000.50"), Ok(500050));
        assert_eq!(parse_amount("R1,234.05"), Ok(123405));
    }

    #[test]
    fn amount_single_decimal_is_tenths() {
        assert_eq!(parse_amount("5000.5"), Ok(500050));
    }

    #[test]
    fn amount_too_many_decimals_rejected() {
        assert!(parse_amount("5000.567").is_err());
    }

    #[test]
    fn amount_stray_letter_rejected() {
        assert!(parse_amount("5R0").is_err());
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

    #[test]
    fn resolve_today_and_empty_return_base() {
        let base = days_from_civil(2026, 6, 17);
        assert_eq!(resolve_date("", base), Ok(base));
        assert_eq!(resolve_date("today", base), Ok(base));
        assert_eq!(resolve_date("  Today ", base), Ok(base));
    }

    #[test]
    fn resolve_relative_offsets() {
        let base = days_from_civil(2026, 6, 25);
        assert_eq!(resolve_date("+30", base), Ok(base + 30));
        assert_eq!(resolve_date("-5", base), Ok(base - 5));
    }

    #[test]
    fn resolve_absolute_date() {
        let base = days_from_civil(2026, 6, 17);
        assert_eq!(
            resolve_date("2026-07-24", base),
            Ok(days_from_civil(2026, 7, 24))
        );
    }

    #[test]
    fn resolve_bad_offset_rejected() {
        assert!(resolve_date("+abc", 0).is_err());
    }
}
