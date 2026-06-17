pub fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

pub fn days_in_month(y: i64, m: i64) -> i64 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap(y) {
                29
            } else {
                28
            }
        }
        _ => 0,
    }
}

pub fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era_base = if y >= 0 { y } else { y - 399 };
    let era = era_base / 400;
    let yoe = y - era * 400;
    let doy_mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * doy_mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

pub fn civil_from_days(z0: i64) -> (i64, i64, i64) {
    let z = z0 + 719468;
    let era_base = if z >= 0 { z } else { z - 146096 };
    let era = era_base / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y_adj = if m <= 2 { y + 1 } else { y };
    (y_adj, m, d)
}

pub fn weekday(days: i64) -> i64 {
    (((days % 7) + 4) % 7 + 7) % 7
}

pub fn today() -> i64 {
    use chrono::{Datelike, Local};
    let now = Local::now().date_naive();
    days_from_civil(now.year() as i64, now.month() as i64, now.day() as i64)
}

pub const WD: [&str; 7] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
pub const MON: [&str; 13] = [
    "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

pub fn fmt_wd_dm(days: i64) -> String {
    let (_, m, d) = civil_from_days(days);
    format!("{} {} {}", WD[weekday(days) as usize], d, MON[m as usize])
}

pub fn fmt_wd_dmy(days: i64) -> String {
    let (y, m, d) = civil_from_days(days);
    format!(
        "{} {} {} {}",
        WD[weekday(days) as usize],
        d,
        MON[m as usize],
        y
    )
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
        assert_eq!(weekday(0), 4);
    }

    #[test]
    fn weekday_known_wednesday() {
        assert_eq!(weekday(days_from_civil(2026, 6, 17)), 3);
    }

    #[test]
    fn weekday_known_thursday() {
        assert_eq!(weekday(days_from_civil(2026, 6, 25)), 4);
    }

    #[test]
    fn weekday_known_monday() {
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
