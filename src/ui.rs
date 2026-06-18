use crate::app::{App, Step};
use pacer::compute::{cover_end, fmt_money, per_day};
use pacer::date::{fmt_range, fmt_wd_dm, WD};
use ratatui::{
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Cell, Paragraph, Row, Table},
    Frame,
};

pub fn draw(frame: &mut Frame, app: &App) {
    let area = frame.area();

    let results_height: u16 = app
        .results
        .as_ref()
        .map_or(0, |(dates, _, _)| dates.len() as u16 + 5);

    let chunks = Layout::vertical([
        Constraint::Length(2),
        Constraint::Length(5),
        Constraint::Length(results_height),
        Constraint::Length(1),
    ])
    .split(area);

    render_title(frame, chunks[0]);
    if app.step == Step::Settings {
        render_settings(frame, app, chunks[1]);
    } else {
        render_form(frame, app, chunks[1]);
    }
    if app.step == Step::Results {
        render_results(frame, app, chunks[2]);
    }
    render_hint(frame, app, chunks[3]);
}

fn render_title(frame: &mut Frame, area: Rect) {
    let title = Paragraph::new(Line::from(vec![Span::styled(
        "Pacer",
        Style::default()
            .fg(Color::Cyan)
            .add_modifier(Modifier::BOLD),
    )]));
    frame.render_widget(title, area);
}

fn field(
    label_width: usize,
    label: &str,
    input: &str,
    is_active: bool,
    is_done: bool,
    cursor: usize,
) -> Line<'static> {
    let active_style = Style::default()
        .fg(Color::Cyan)
        .add_modifier(Modifier::BOLD);
    let dim_style = Style::default().add_modifier(Modifier::DIM);
    let (label_s, bracket_s, value_s) = if is_active {
        (Style::default(), active_style, active_style)
    } else if is_done {
        (dim_style, dim_style, Style::default())
    } else {
        (dim_style, dim_style, dim_style)
    };
    let mut spans = vec![
        Span::styled(format!("  {:<width$}", label, width = label_width), label_s),
        Span::styled("[", bracket_s),
    ];
    if is_active {
        let chars: Vec<char> = input.chars().collect();
        let at = cursor.min(chars.len());
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
        spans.push(Span::styled(
            on,
            active_style.add_modifier(Modifier::REVERSED),
        ));
        spans.push(Span::styled(after, value_s));
    } else {
        spans.push(Span::styled(input.to_string(), value_s));
    }
    spans.push(Span::styled("]", bracket_s));
    Line::from(spans)
}

fn status_line(app: &App) -> Line<'static> {
    if let Some(n) = &app.notice {
        Line::from(Span::styled(
            format!("  ✓ {}", n),
            Style::default().fg(Color::Green),
        ))
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
    let lines = vec![
        field(
            18,
            "Pay date",
            &app.pay_input,
            app.step == Step::PayDate,
            app.pay.is_some(),
            app.cursor,
        ),
        field(
            18,
            "Last day",
            &app.last_input,
            app.step == Step::LastDay,
            app.last.is_some(),
            app.cursor,
        ),
        field(
            18,
            "Amount (R)",
            &app.amount_input,
            app.step == Step::Amount,
            app.total.is_some(),
            app.cursor,
        ),
        Line::from(""),
        status_line(app),
    ];

    frame.render_widget(Paragraph::new(lines), area);
}

fn render_settings(frame: &mut Frame, app: &App, area: Rect) {
    let active_style = Style::default()
        .fg(Color::Cyan)
        .add_modifier(Modifier::BOLD);
    let dim_style = Style::default().add_modifier(Modifier::DIM);

    let payday_active = app.settings_cursor == 1;
    let (p_label_s, p_value_s) = if payday_active {
        (Style::default(), active_style)
    } else {
        (dim_style, Style::default())
    };
    let payday_line = Line::from(vec![
        Span::styled(format!("  {:<14}", "Payout day"), p_label_s),
        Span::styled(format!("‹ {} ›", WD[app.config.payday as usize]), p_value_s),
    ]);

    let lines = vec![
        field(
            14,
            "Quantum (R)",
            &app.quantum_input,
            app.settings_cursor == 0,
            app.settings_cursor != 0,
            app.cursor,
        ),
        payday_line,
        field(
            14,
            "Every (days)",
            &app.interval_input,
            app.settings_cursor == 2,
            app.settings_cursor != 2,
            app.cursor,
        ),
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

    let header = Row::new(vec![
        Cell::from("Pay"),
        Cell::from("Covers"),
        Cell::from("Days"),
        Cell::from("Amount"),
        Cell::from("Per day"),
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
            let cover_end = cover_end(dates[i], seg_days[i]);
            let per_day = per_day(amounts[i], seg_days[i]);
            let pay_style = if i == 0 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };
            Row::new(vec![
                Cell::from(fmt_wd_dm(d)).style(pay_style),
                Cell::from(fmt_range(d, cover_end)),
                Cell::from(seg_days[i].to_string()),
                Cell::from(fmt_money(amounts[i])).style(Style::default().fg(Color::Green)),
                Cell::from(fmt_money(per_day)).style(Style::default().add_modifier(Modifier::DIM)),
            ])
        })
        .collect();

    rows.push(
        Row::new(vec![
            Cell::from("Total").style(Style::default().add_modifier(Modifier::BOLD)),
            Cell::from(""),
            Cell::from(total_days.to_string()).style(Style::default().add_modifier(Modifier::BOLD)),
            Cell::from(fmt_money(total)).style(
                Style::default()
                    .fg(Color::Green)
                    .add_modifier(Modifier::BOLD),
            ),
            Cell::from(""),
        ])
        .style(Style::default().add_modifier(Modifier::BOLD)),
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

    frame.render_widget(table, area);
}

fn render_hint(frame: &mut Frame, app: &App, area: Rect) {
    let hint = if app.step == Step::Settings {
        "  ↑/↓ field   ←/→ change   Enter → save   Esc → cancel".to_string()
    } else if app.step == Step::Results {
        format!(
            "  ↑/↓ extra to first pay ({})   s → save csv   Esc → edit   q → quit   F2 → settings",
            fmt_money(app.boost)
        )
    } else {
        "  Enter → confirm   Esc → back   ←/→ move cursor   F2 → settings   Ctrl+C → quit"
            .to_string()
    };
    frame.render_widget(
        Paragraph::new(Line::from(Span::styled(
            hint,
            Style::default().add_modifier(Modifier::DIM),
        ))),
        area,
    );
}
