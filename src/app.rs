use pacer::compute::{compute, cover_end, fmt_money, per_day};
use pacer::config::Config;
use pacer::date::{fmt_dmy, fmt_range, today};
use pacer::parse::{parse_amount, resolve_date};

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum Step {
    PayDate,
    LastDay,
    Amount,
    Results,
    Settings,
}

pub struct App {
    pub step: Step,
    pub pay_input: String,
    pub last_input: String,
    pub amount_input: String,
    pub cursor: usize,
    pub error: Option<String>,
    pub notice: Option<String>,
    pub today: i64,
    pub pay: Option<i64>,
    pub last: Option<i64>,
    pub total: Option<i64>,
    pub boost: i64,
    pub results: Option<(Vec<i64>, Vec<i64>, Vec<i64>)>,
    pub should_quit: bool,
    pub config: Config,
    pub settings_cursor: usize,
    pub quantum_input: String,
    pub interval_input: String,
    settings_return: Step,
}

impl Default for App {
    fn default() -> Self {
        Self::new(Config::default())
    }
}

const MAX_DAYS: i64 = 366;

fn byte_index(s: &str, char_idx: usize) -> usize {
    s.char_indices()
        .nth(char_idx)
        .map(|(i, _)| i)
        .unwrap_or(s.len())
}

impl App {
    pub fn new(config: Config) -> Self {
        Self {
            step: Step::PayDate,
            pay_input: String::new(),
            last_input: String::new(),
            amount_input: String::new(),
            cursor: 0,
            error: None,
            notice: None,
            today: today(),
            pay: None,
            last: None,
            total: None,
            boost: 0,
            results: None,
            should_quit: false,
            config,
            settings_cursor: 0,
            quantum_input: String::new(),
            interval_input: String::new(),
            settings_return: Step::PayDate,
        }
    }

    fn active_input(&mut self) -> Option<&mut String> {
        match self.step {
            Step::PayDate => Some(&mut self.pay_input),
            Step::LastDay => Some(&mut self.last_input),
            Step::Amount => Some(&mut self.amount_input),
            Step::Settings => match self.settings_cursor {
                0 => Some(&mut self.quantum_input),
                2 => Some(&mut self.interval_input),
                _ => None,
            },
            Step::Results => None,
        }
    }

    fn active_len(&self) -> usize {
        match self.step {
            Step::PayDate => self.pay_input.chars().count(),
            Step::LastDay => self.last_input.chars().count(),
            Step::Amount => self.amount_input.chars().count(),
            Step::Settings => match self.settings_cursor {
                0 => self.quantum_input.chars().count(),
                2 => self.interval_input.chars().count(),
                _ => 0,
            },
            Step::Results => 0,
        }
    }

    fn clear_msgs(&mut self) {
        self.error = None;
        self.notice = None;
    }

    pub fn push_char(&mut self, c: char) {
        self.clear_msgs();
        let cursor = self.cursor;
        let mut inserted = false;
        if let Some(input) = self.active_input() {
            let bi = byte_index(input, cursor);
            input.insert(bi, c);
            inserted = true;
        }
        if inserted {
            self.cursor += 1;
        }
    }

    pub fn pop_char(&mut self) {
        self.clear_msgs();
        if self.cursor == 0 {
            return;
        }
        let cursor = self.cursor;
        let mut removed = false;
        if let Some(input) = self.active_input() {
            let bi = byte_index(input, cursor - 1);
            input.remove(bi);
            removed = true;
        }
        if removed {
            self.cursor -= 1;
        }
    }

    pub fn delete_char(&mut self) {
        self.clear_msgs();
        if self.cursor >= self.active_len() {
            return;
        }
        let cursor = self.cursor;
        if let Some(input) = self.active_input() {
            let bi = byte_index(input, cursor);
            input.remove(bi);
        }
    }

    pub fn cursor_left(&mut self) {
        self.cursor = self.cursor.saturating_sub(1);
    }

    pub fn cursor_right(&mut self) {
        self.cursor = (self.cursor + 1).min(self.active_len());
    }

    pub fn cursor_home(&mut self) {
        self.cursor = 0;
    }

    pub fn cursor_end(&mut self) {
        self.cursor = self.active_len();
    }

    pub fn confirm(&mut self) {
        self.clear_msgs();
        match self.step {
            Step::PayDate => match resolve_date(&self.pay_input, self.today) {
                Ok(v) => {
                    self.pay = Some(v);
                    self.step = Step::LastDay;
                    self.cursor = self.active_len();
                }
                Err(e) => self.error = Some(e),
            },
            Step::LastDay => {
                if self.last_input.trim().is_empty() {
                    self.error = Some("enter the last day (e.g. +30 or 2026-07-24)".into());
                    return;
                }
                let pay = self.pay.unwrap();
                match resolve_date(&self.last_input, pay) {
                    Ok(v) => {
                        if v < pay {
                            self.error = Some("must be on or after the pay date".into());
                        } else if v - pay + 1 > MAX_DAYS {
                            self.error = Some("period can't be longer than a year".into());
                        } else {
                            self.last = Some(v);
                            self.step = Step::Amount;
                            self.cursor = self.active_len();
                        }
                    }
                    Err(e) => self.error = Some(e),
                }
            }
            Step::Amount => match parse_amount(&self.amount_input) {
                Ok(v) => {
                    self.total = Some(v);
                    self.boost = 0;
                    self.recompute();
                    self.step = Step::Results;
                    self.cursor = 0;
                }
                Err(e) => self.error = Some(e),
            },
            Step::Results => {}
            Step::Settings => {}
        }
    }

    pub fn go_back(&mut self) {
        self.clear_msgs();
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
                self.boost = 0;
                self.results = None;
                self.step = Step::Amount;
            }
            Step::Settings => self.close_settings(),
        }
        self.cursor = self.active_len();
    }

    fn recompute(&mut self) {
        let (pay, last) = (self.pay.unwrap(), self.last.unwrap());
        let total = self.total.unwrap();
        self.results = Some(compute(pay, last, total, self.boost, &self.config));
    }

    pub fn boost_up(&mut self) {
        self.clear_msgs();
        self.boost = (self.boost + self.config.quantum).min(self.total.unwrap());
        self.recompute();
    }

    pub fn boost_down(&mut self) {
        self.clear_msgs();
        self.boost = (self.boost - self.config.quantum).max(0);
        self.recompute();
    }

    pub fn open_settings(&mut self) {
        if self.step == Step::Settings {
            return;
        }
        self.clear_msgs();
        self.settings_return = self.step;
        self.settings_cursor = 0;
        self.quantum_input = fmt_money(self.config.quantum)
            .trim_start_matches('R')
            .to_string();
        self.interval_input = self.config.interval.to_string();
        self.step = Step::Settings;
        self.cursor = self.active_len();
    }

    fn close_settings(&mut self) {
        self.step = self.settings_return;
    }

    pub fn settings_up(&mut self) {
        self.clear_msgs();
        self.settings_cursor = self.settings_cursor.saturating_sub(1);
        self.cursor = self.active_len();
    }

    pub fn settings_down(&mut self) {
        self.clear_msgs();
        self.settings_cursor = (self.settings_cursor + 1).min(2);
        self.cursor = self.active_len();
    }

    pub fn payday_prev(&mut self) {
        self.clear_msgs();
        self.config.payday = (self.config.payday - 1).rem_euclid(7);
    }

    pub fn payday_next(&mut self) {
        self.clear_msgs();
        self.config.payday = (self.config.payday + 1).rem_euclid(7);
    }

    pub fn save_settings(&mut self) {
        self.clear_msgs();
        let quantum = match parse_amount(&self.quantum_input) {
            Ok(v) => v,
            Err(e) => {
                self.error = Some(e);
                return;
            }
        };
        let interval: i64 = match self.interval_input.trim().parse() {
            Ok(v) if v >= 1 => v,
            _ => {
                self.error = Some("interval must be a whole number of days".into());
                return;
            }
        };
        let config = Config {
            quantum,
            payday: self.config.payday,
            interval,
        }
        .sanitized();
        match config.save() {
            Ok(()) => {
                self.config = config;
                self.notice = Some("settings saved".into());
                self.close_settings();
            }
            Err(e) => self.error = Some(format!("could not save settings: {}", e)),
        }
    }

    pub fn csv(&self) -> Option<String> {
        let (dates, seg_days, amounts) = self.results.as_ref()?;
        let total = self.total?;
        let mut out = String::from("Pay date,Covers,Days,Amount,Per day\n");
        for i in 0..dates.len() {
            out.push_str(&format!(
                "\"{}\",\"{}\",{},\"{}\",\"{}\"\n",
                fmt_dmy(dates[i]),
                fmt_range(dates[i], cover_end(dates[i], seg_days[i])),
                seg_days[i],
                fmt_money(amounts[i]),
                fmt_money(per_day(amounts[i], seg_days[i])),
            ));
        }
        let total_days: i64 = seg_days.iter().sum();
        out.push_str(&format!(
            "\"Total\",,{},\"{}\",\n",
            total_days,
            fmt_money(total)
        ));
        Some(out)
    }

    pub fn quit(&mut self) {
        self.should_quit = true;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pacer::date::days_from_civil;

    fn app_at(today: i64) -> App {
        let mut a = App::new(Config::default());
        a.today = today;
        a
    }

    #[test]
    fn empty_pay_date_defaults_to_today() {
        let today = days_from_civil(2026, 6, 17);
        let mut a = app_at(today);
        a.confirm();
        assert_eq!(a.step, Step::LastDay);
        assert_eq!(a.pay, Some(today));
    }

    #[test]
    fn relative_last_day_is_offset_from_pay() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        a.last_input = "+30".into();
        a.confirm();
        assert_eq!(a.step, Step::Amount);
        assert_eq!(a.last, Some(days_from_civil(2026, 6, 25) + 30));
    }

    #[test]
    fn last_day_before_pay_is_rejected() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        a.last_input = "2026-06-24".into();
        a.confirm();
        assert_eq!(a.step, Step::LastDay);
        assert!(a.error.is_some());
    }

    #[test]
    fn empty_last_day_is_rejected() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        a.confirm();
        assert_eq!(a.step, Step::LastDay);
        assert!(a.error.is_some());
    }

    #[test]
    fn go_back_clears_value() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        assert_eq!(a.step, Step::LastDay);
        a.go_back();
        assert_eq!(a.step, Step::PayDate);
        assert_eq!(a.pay, None);
    }

    #[test]
    fn insert_at_cursor() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.push_char('2');
        a.push_char('6');
        a.cursor_left();
        a.push_char('5');
        assert_eq!(a.pay_input, "256");
        assert_eq!(a.cursor, 2);
    }

    #[test]
    fn backspace_at_cursor() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        for c in "2026".chars() {
            a.push_char(c);
        }
        a.cursor_home();
        a.cursor_right();
        a.pop_char();
        assert_eq!(a.pay_input, "026");
        assert_eq!(a.cursor, 0);
    }

    #[test]
    fn boost_is_clamped_to_total() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        a.last_input = "2026-07-24".into();
        a.confirm();
        a.amount_input = "5000".into();
        a.confirm();
        assert_eq!(a.step, Step::Results);
        for _ in 0..1000 {
            a.boost_up();
        }
        assert_eq!(a.boost, a.total.unwrap());
        for _ in 0..2000 {
            a.boost_down();
        }
        assert_eq!(a.boost, 0);
    }

    #[test]
    fn over_long_period_is_rejected() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        a.last_input = "+400".into();
        a.confirm();
        assert_eq!(a.step, Step::LastDay);
        assert!(a.error.is_some());
    }

    #[test]
    fn full_year_period_is_accepted() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        a.last_input = "+365".into();
        a.confirm();
        assert_eq!(a.step, Step::Amount);
    }

    #[test]
    fn csv_has_header_row_per_segment_and_total() {
        let mut a = app_at(days_from_civil(2026, 6, 17));
        a.pay_input = "2026-06-25".into();
        a.confirm();
        a.last_input = "2026-07-24".into();
        a.confirm();
        a.amount_input = "5000".into();
        a.confirm();
        let csv = a.csv().unwrap();
        let lines: Vec<&str> = csv.lines().collect();
        let segments = a.results.as_ref().unwrap().0.len();
        assert_eq!(lines[0], "Pay date,Covers,Days,Amount,Per day");
        assert_eq!(lines.len(), segments + 2);
        assert!(lines.last().unwrap().starts_with("\"Total\""));
    }

    #[test]
    fn csv_is_none_before_results() {
        let a = app_at(days_from_civil(2026, 6, 17));
        assert!(a.csv().is_none());
    }
}
