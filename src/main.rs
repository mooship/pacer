mod app;
mod ui;

use app::{App, Step};
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use pacer::config::Config;
use std::io;

const EXPORT_PATH: &str = "pacer-budget.csv";

const HELP: &str = "\
pacer — split a salary into a bridge payment plus recurring allowances

Usage:
  pacer            launch the interactive TUI
  pacer --help     show this help and exit
  pacer --version  show the version and exit

In the TUI:
  Pay date   YYYY-MM-DD, blank or `today`
  Last day   YYYY-MM-DD or a relative offset like +30
  Amount     Rand, optional cents: 5000, R5,000, 5000.50

Keys:
  Enter confirm   Esc back   ←/→ move cursor   F2 settings   Ctrl+C quit
  Results: ↑/↓ move money into the bridge   PgUp/PgDn ×10   Home/End min/max
           s save csv   q quit

Set NO_COLOR to disable colored output.
";

fn main() -> io::Result<()> {
    if let Some(arg) = std::env::args().nth(1) {
        match arg.as_str() {
            "-h" | "--help" => {
                print!("{}", HELP);
                return Ok(());
            }
            "-V" | "--version" => {
                println!("pacer {}", env!("CARGO_PKG_VERSION"));
                return Ok(());
            }
            other => {
                eprintln!("pacer: unknown argument `{}`; try `pacer --help`", other);
                std::process::exit(2);
            }
        }
    }

    let mut terminal = ratatui::init();
    let result = run(&mut terminal);
    ratatui::restore();
    result
}

fn run(terminal: &mut ratatui::DefaultTerminal) -> io::Result<()> {
    let (config, invalid) = Config::load();
    let mut app = App::new(config);
    app.color = std::env::var_os("NO_COLOR").is_none_or(|v| v.is_empty());
    if invalid {
        app.notice = Some("config.toml is invalid; using defaults".into());
    }

    loop {
        terminal.draw(|frame| ui::draw(frame, &app))?;

        let Event::Key(key) = event::read()? else {
            continue;
        };
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
        if app.step == Step::Results {
            match key.code {
                KeyCode::Char('q') => app.quit(),
                KeyCode::Char('s') => {
                    if let Some(content) = app.csv() {
                        match std::fs::write(EXPORT_PATH, content) {
                            Ok(_) => app.notice = Some(format!("saved to {}", export_location())),
                            Err(e) => app.error = Some(format!("could not save: {}", e)),
                        }
                    }
                }
                KeyCode::Up | KeyCode::Char('+') | KeyCode::Char('=') => app.boost_up(),
                KeyCode::Down | KeyCode::Char('-') | KeyCode::Char('_') => app.boost_down(),
                KeyCode::PageUp => app.boost_up_coarse(),
                KeyCode::PageDown => app.boost_down_coarse(),
                KeyCode::Home => app.boost_to_min(),
                KeyCode::End => app.boost_to_max(),
                KeyCode::Esc => app.go_back(),
                _ => {}
            }
            if app.should_quit {
                break;
            }
            continue;
        }
        match key.code {
            KeyCode::Enter => app.confirm(),
            KeyCode::Esc => app.go_back(),
            other => handle_edit_key(&mut app, other),
        }
    }

    Ok(())
}

fn export_location() -> String {
    std::fs::canonicalize(EXPORT_PATH)
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| EXPORT_PATH.to_string())
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
