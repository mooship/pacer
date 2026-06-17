use pacer::compute::{compute, QUANTUM};
use pacer::parse::{parse_amount, parse_date_days};

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
    pub boost: i64,
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
            boost: 0,
            results: None,
            should_quit: false,
        }
    }

    fn active_input(&mut self) -> Option<&mut String> {
        match self.step {
            Step::PayDate => Some(&mut self.pay_input),
            Step::LastDay => Some(&mut self.last_input),
            Step::Amount => Some(&mut self.amount_input),
            Step::Results => None,
        }
    }

    pub fn push_char(&mut self, c: char) {
        self.error = None;
        if let Some(input) = self.active_input() {
            input.push(c);
        }
    }

    pub fn pop_char(&mut self) {
        self.error = None;
        if let Some(input) = self.active_input() {
            input.pop();
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
                    self.boost = 0;
                    self.recompute();
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
                self.boost = 0;
                self.results = None;
                self.step = Step::Amount;
            }
        }
    }

    fn recompute(&mut self) {
        let (pay, last) = (self.pay.unwrap(), self.last.unwrap());
        let total = self.total.unwrap();
        self.results = Some(compute(pay, last, total, self.boost));
    }

    pub fn boost_up(&mut self) {
        if self.step != Step::Results {
            return;
        }
        let cap = (self.total.unwrap() / QUANTUM) * QUANTUM;
        self.boost = (self.boost + QUANTUM).min(cap);
        self.recompute();
    }

    pub fn boost_down(&mut self) {
        if self.step != Step::Results {
            return;
        }
        self.boost = (self.boost - QUANTUM).max(0);
        self.recompute();
    }

    pub fn quit(&mut self) {
        self.should_quit = true;
    }
}
