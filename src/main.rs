mod app;
mod ui;

use app::{App, Step};
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use pacer::config::Config;
use std::io;

const EXPORT_PATH: &str = "pacer-budget.csv";

fn main() -> io::Result<()> {
    let mut terminal = ratatui::init();
    let result = run(&mut terminal);
    ratatui::restore();
    result
}

fn run(terminal: &mut ratatui::DefaultTerminal) -> io::Result<()> {
    let mut app = App::new(Config::load());

    loop {
        terminal.draw(|frame| ui::draw(frame, &app))?;

        if event::poll(std::time::Duration::from_millis(50))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                if key.code == KeyCode::Char('c') && key.modifiers.contains(KeyModifiers::CONTROL) {
                    break;
                }
                if key.code == KeyCode::F(2) {
                    app.open_settings();
                    continue;
                }
                if app.step == Step::Settings {
                    match key.code {
                        KeyCode::Up => app.settings_up(),
                        KeyCode::Down => app.settings_down(),
                        KeyCode::Left if app.settings_cursor == 1 => app.payday_prev(),
                        KeyCode::Right if app.settings_cursor == 1 => app.payday_next(),
                        KeyCode::Enter => app.save_settings(),
                        KeyCode::Esc => app.go_back(),
                        other => handle_edit_key(&mut app, other),
                    }
                    continue;
                }
                match key.code {
                    KeyCode::Char('q') if app.step == Step::Results => app.quit(),
                    KeyCode::Char('s') if app.step == Step::Results => {
                        if let Some(content) = app.csv() {
                            match std::fs::write(EXPORT_PATH, content) {
                                Ok(_) => app.notice = Some(format!("saved to {}", EXPORT_PATH)),
                                Err(e) => app.error = Some(format!("could not save: {}", e)),
                            }
                        }
                    }
                    KeyCode::Up | KeyCode::Char('+') | KeyCode::Char('=')
                        if app.step == Step::Results =>
                    {
                        app.boost_up()
                    }
                    KeyCode::Down | KeyCode::Char('-') | KeyCode::Char('_')
                        if app.step == Step::Results =>
                    {
                        app.boost_down()
                    }
                    KeyCode::Enter => app.confirm(),
                    KeyCode::Esc => app.go_back(),
                    other => handle_edit_key(&mut app, other),
                }
            }
        }

        if app.should_quit {
            break;
        }
    }

    Ok(())
}

fn handle_edit_key(app: &mut App, code: KeyCode) {
    match code {
        KeyCode::Left => app.cursor_left(),
        KeyCode::Right => app.cursor_right(),
        KeyCode::Home => app.cursor_home(),
        KeyCode::End => app.cursor_end(),
        KeyCode::Delete => app.delete_char(),
        KeyCode::Char(c) => app.push_char(c),
        KeyCode::Backspace => app.pop_char(),
        _ => {}
    }
}
