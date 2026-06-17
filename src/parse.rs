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
