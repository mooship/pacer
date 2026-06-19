use crate::app::{App, Step};
use pacer::compute::{cover_end, fmt_money, per_day};
use pacer::date::{fmt_range, fmt_wd_dm, fmt_wd_dmy, WD};
use pacer::parse::{parse_amount, resolve_date};
use ratatui::{
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
    Frame,
};

const ACCENT: Style = Style::new().fg(Color::Cyan).add_modifier(Modifier::BOLD);
const DIM: Style = Style::new().add_modifier(Modifier::DIM);
const BOLD: Style = Style::new().add_modifier(Modifier::BOLD);
const GREEN: Style = Style::new().fg(Color::Green);

pub fn draw(frame: &mut Frame, app: &App) {
    let area = frame.area();

    let results_height: u16 = app
        .results
        .as_ref()
        .map_or(0, |(dates, _, _)| dates.len() as u16 + 5);

    let chunks = Layout::vertical([
        Constraint::Length(1),
        Constraint::Length(1),
        Constraint::Length(5),
        Constraint::Length(results_height),
        Constraint::Length(1),
    ])
    .split(area);

    render_title(frame, chunks[0]);
    render_breadcrumb(frame, app, chunks[1]);
    if app.step == Step::Settings {
        render_settings(frame, app, chunks[2]);
    } else {
        render_form(frame, app, chunks[2]);
    }
    if app.step == Step::Results {
        render_results(frame, app, chunks[3]);
    }
    render_hint(frame, app, chunks[4]);
}

fn render_title(frame: &mut Frame, area: Rect) {
    let title = Paragraph::new(Line::from(vec![Span::styled("Pacer", ACCENT)]));
    frame.render_widget(title, area);
}

fn render_breadcrumb(frame: &mut Frame, app: &App, area: Rect) {
    if app.step == Step::Settings {
        let line = Line::from(Span::styled("  Settings", DIM));
        frame.render_widget(Paragraph::new(line), area);
        return;
    }
    let current = match app.step {
        Step::PayDate => 0,
        Step::LastDay => 1,
        Step::Amount => 2,
        _ => 3,
    };
    let names = ["Pay date", "Last day", "Amount"];
    let mut spans = vec![Span::raw("  ")];
    for (i, name) in names.iter().enumerate() {
        if i > 0 {
            spans.push(Span::styled(" › ", DIM));
        }
        if i < current {
            spans.push(Span::styled(
                format!("✓ {}", name),
                GREEN.add_modifier(Modifier::DIM),
            ));
        } else if i == current {
            spans.push(Span::styled(name.to_string(), ACCENT));
        } else {
            spans.push(Span::styled(name.to_string(), DIM));
        }
    }
    frame.render_widget(Paragraph::new(Line::from(spans)), area);
}

struct Field<'a> {
    label_width: usize,
    label: &'a str,
    input: &'a str,
    is_active: bool,
    is_done: bool,
    cursor: usize,
    placeholder: &'a str,
    preview: &'a str,
}

fn field(f: Field) -> Line<'static> {
    let (label_s, bracket_s, value_s) = if f.is_active {
        (Style::default(), ACCENT, ACCENT)
    } else if f.is_done {
        (DIM, DIM, Style::default())
    } else {
        (DIM, DIM, DIM)
    };
    let mut spans = vec![
        Span::styled(
            format!("  {:<width$}", f.label, width = f.label_width),
            label_s,
        ),
        Span::styled("[", bracket_s),
    ];
    if f.input.is_empty() {
        if f.is_active {
            spans.push(Span::styled(
                " ".to_string(),
                ACCENT.add_modifier(Modifier::REVERSED),
            ));
        }
        if !f.placeholder.is_empty() {
            spans.push(Span::styled(f.placeholder.to_string(), DIM));
        }
    } else if f.is_active {
        let chars: Vec<char> = f.input.chars().collect();
        let at = f.cursor.min(chars.len());
        let before: String = chars[..at].iter().collect();
        let on: String = chars
            .get(at)
            .map(|c| c.to_string())
            .unwrap_or_else(|| " ".into());
        let after: String = chars
            .get(at + 1..)
            .map(|c| c.iter().collect())
            .unwrap_or_default();
        spans.push(Span::styled(before, value_s));
        spans.push(Span::styled(on, ACCENT.add_modifier(Modifier::REVERSED)));
        spans.push(Span::styled(after, value_s));
    } else {
        spans.push(Span::styled(f.input.to_string(), value_s));
    }
    spans.push(Span::styled("]", bracket_s));
    if !f.preview.is_empty() {
        let preview_style = if f.is_active {
            GREEN
        } else {
            GREEN.add_modifier(Modifier::DIM)
        };
        spans.push(Span::styled(format!("  → {}", f.preview), preview_style));
    }
    Line::from(spans)
}

fn status_line(app: &App) -> Line<'static> {
    if let Some(n) = &app.notice {
        Line::from(Span::styled(format!("  ✓ {}", n), GREEN))
    } else if let Some(e) = &app.error {
        Line::from(Span::styled(
            format!("  ✗ {}", e),
            Style::default().fg(Color::Red),
        ))
    } else {
        Line::from("")
    }
}

fn render_form(frame: &mut Frame, app: &App, area: Rect) {
    let pay_preview = resolve_date(&app.pay_input, app.today)
        .ok()
        .map(fmt_wd_dmy)
        .unwrap_or_default();

    let last_preview = match app.pay {
        Some(pay) if !app.last_input.trim().is_empty() => resolve_date(&app.last_input, pay)
            .ok()
            .filter(|&v| v >= pay)
            .map(|v| format!("{} · {} days", fmt_wd_dmy(v), v - pay + 1))
            .unwrap_or_default(),
        _ => String::new(),
    };

    let amount_preview = if app.amount_input.trim().is_empty() {
        String::new()
    } else {
        parse_amount(&app.amount_input)
            .map(fmt_money)
            .unwrap_or_default()
    };

    let lines = vec![
        field(Field {
            label_width: 18,
            label: "Pay date",
            input: &app.pay_input,
            is_active: app.step == Step::PayDate,
            is_done: app.pay.is_some(),
            cursor: app.cursor,
            placeholder: "today, +7, or 2026-07-25",
            preview: &pay_preview,
        }),
        field(Field {
            label_width: 18,
            label: "Last day",
            input: &app.last_input,
            is_active: app.step == Step::LastDay,
            is_done: app.last.is_some(),
            cursor: app.cursor,
            placeholder: "+30 or 2026-07-25",
            preview: &last_preview,
        }),
        field(Field {
            label_width: 18,
            label: "Amount (R)",
            input: &app.amount_input,
            is_active: app.step == Step::Amount,
            is_done: app.total.is_some(),
            cursor: app.cursor,
            placeholder: "e.g. 18500",
            preview: &amount_preview,
        }),
        Line::from(""),
        status_line(app),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_settings(frame: &mut Frame, app: &App, area: Rect) {
    let payday_active = app.settings_cursor == 1;
    let (p_label_s, p_value_s) = if payday_active {
        (Style::default(), ACCENT)
    } else {
        (DIM, Style::default())
    };
    let payday_line = Line::from(vec![
        Span::styled(format!("  {:<14}", "Payout day"), p_label_s),
        Span::styled(format!("‹ {} ›", WD[app.config.payday as usize]), p_value_s),
    ]);

    let lines = vec![
        field(Field {
            label_width: 14,
            label: "Quantum (R)",
            input: &app.quantum_input,
            is_active: app.settings_cursor == 0,
            is_done: app.settings_cursor != 0,
            cursor: app.cursor,
            placeholder: "",
            preview: "",
        }),
        payday_line,
        field(Field {
            label_width: 14,
            label: "Every (days)",
            input: &app.interval_input,
            is_active: app.settings_cursor == 2,
            is_done: app.settings_cursor != 2,
            cursor: app.cursor,
            placeholder: "",
            preview: "",
        }),
        status_line(app),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_results(frame: &mut Frame, app: &App, area: Rect) {
    let (dates, seg_days, amounts) = match &app.results {
        Some(r) => r,
        None => return,
    };
    let total = app.total.unwrap();
    let total_days: i64 = seg_days.iter().sum();

    let parts = Layout::vertical([Constraint::Length(1), Constraint::Min(0)]).split(area);

    let info = Line::from(vec![
        Span::styled("  Bridge top-up  ", DIM),
        Span::styled(
            fmt_money(app.boost),
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled("   ↑/↓ to move money into the first, shorter payment", DIM),
    ]);
    frame.render_widget(Paragraph::new(info), parts[0]);

    let header = Row::new(vec![
        Cell::from("Pay"),
        Cell::from("Covers"),
        Cell::from("Days"),
        Cell::from("Amount"),
        Cell::from("Per day"),
    ])
    .style(ACCENT)
    .height(1);

    let mut rows: Vec<Row> = dates
        .iter()
        .enumerate()
        .map(|(i, &d)| {
            let cover_end = cover_end(dates[i], seg_days[i]);
            let per_day = per_day(amounts[i], seg_days[i]);
            let pay_style = if i == 0 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };
            let row_style = if i % 2 == 1 { DIM } else { Style::default() };
            Row::new(vec![
                Cell::from(fmt_wd_dm(d)).style(pay_style),
                Cell::from(fmt_range(d, cover_end)),
                Cell::from(seg_days[i].to_string()),
                Cell::from(fmt_money(amounts[i])).style(GREEN),
                Cell::from(fmt_money(per_day)).style(DIM),
            ])
            .style(row_style)
        })
        .collect();

    rows.push(
        Row::new(vec![
            Cell::from("Total").style(BOLD),
            Cell::from(""),
            Cell::from(total_days.to_string()).style(BOLD),
            Cell::from(fmt_money(total)).style(GREEN.add_modifier(Modifier::BOLD)),
            Cell::from(""),
        ])
        .style(BOLD),
    );

    let widths = [
        Constraint::Length(13),
        Constraint::Length(16),
        Constraint::Length(6),
        Constraint::Length(12),
        Constraint::Length(12),
    ];

    let table = Table::new(rows, widths)
        .header(header)
        .block(Block::default().borders(Borders::ALL));

    frame.render_widget(table, parts[1]);
}

fn render_hint(frame: &mut Frame, app: &App, area: Rect) {
    let hint = if app.step == Step::Settings {
        "  ↑/↓ field   ←/→ change   Enter → save   Esc → cancel"
    } else if app.step == Step::Results {
        "  s → save csv   Esc → edit   q → quit   F2 → settings"
    } else {
        "  Enter → confirm   Esc → back   ←/→ move cursor   F2 → settings   Ctrl+C → quit"
    };
    frame.render_widget(Paragraph::new(Line::from(Span::styled(hint, DIM))), area);
}
