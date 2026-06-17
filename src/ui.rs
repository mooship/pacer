use crate::app::{App, Step};
use pacer::date::{fmt_range, fmt_wd_dm};
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
    render_form(frame, app, chunks[1]);
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

fn render_form(frame: &mut Frame, app: &App, area: Rect) {
    let active_style = Style::default()
        .fg(Color::Cyan)
        .add_modifier(Modifier::BOLD);
    let dim_style = Style::default().add_modifier(Modifier::DIM);

    let field = |label: &str, input: &str, is_active: bool, is_done: bool| -> Line {
        let (label_s, bracket_s, value_s) = if is_active {
            (Style::default(), active_style, active_style)
        } else if is_done {
            (dim_style, dim_style, Style::default())
        } else {
            (dim_style, dim_style, dim_style)
        };
        let cursor = if is_active { "█" } else { "" };
        Line::from(vec![
            Span::styled(format!("  {:<18}", label), label_s),
            Span::styled("[", bracket_s),
            Span::styled(format!("{}{}", input, cursor), value_s),
            Span::styled("]", bracket_s),
        ])
    };

    let error_line = match &app.error {
        Some(e) => Line::from(Span::styled(
            format!("  ✗ {}", e),
            Style::default().fg(Color::Red),
        )),
        None => Line::from(""),
    };

    let lines = vec![
        field(
            "Pay date",
            &app.pay_input,
            app.step == Step::PayDate,
            app.pay.is_some(),
        ),
        field(
            "Last day",
            &app.last_input,
            app.step == Step::LastDay,
            app.last.is_some(),
        ),
        field(
            "Amount (R)",
            &app.amount_input,
            app.step == Step::Amount,
            app.total.is_some(),
        ),
        Line::from(""),
        error_line,
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
            let cover_end = dates[i] + seg_days[i] - 1;
            let pay_style = if i == 0 {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };
            Row::new(vec![
                Cell::from(fmt_wd_dm(d)).style(pay_style),
                Cell::from(fmt_range(d, cover_end)),
                Cell::from(seg_days[i].to_string()),
                Cell::from(format!("R{}", amounts[i])).style(Style::default().fg(Color::Green)),
            ])
        })
        .collect();

    rows.push(
        Row::new(vec![
            Cell::from("Total").style(Style::default().add_modifier(Modifier::BOLD)),
            Cell::from(""),
            Cell::from(total_days.to_string()).style(Style::default().add_modifier(Modifier::BOLD)),
            Cell::from(format!("R{}", total)).style(
                Style::default()
                    .fg(Color::Green)
                    .add_modifier(Modifier::BOLD),
            ),
        ])
        .style(Style::default().add_modifier(Modifier::BOLD)),
    );

    let widths = [
        Constraint::Length(13),
        Constraint::Length(16),
        Constraint::Length(6),
        Constraint::Length(10),
    ];

    let table = Table::new(rows, widths)
        .header(header)
        .block(Block::default().borders(Borders::ALL));

    frame.render_widget(table, area);
}

fn render_hint(frame: &mut Frame, app: &App, area: Rect) {
    let hint = if app.step == Step::Results {
        "  Esc → edit   q → quit"
    } else {
        "  Enter → confirm   Esc → back   Ctrl+C → quit"
    };
    frame.render_widget(
        Paragraph::new(Line::from(Span::styled(
            hint,
            Style::default().add_modifier(Modifier::DIM),
        ))),
        area,
    );
}
