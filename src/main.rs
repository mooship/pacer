mod app;
mod ui;

use app::{App, Step};
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use std::io;

fn main() -> io::Result<()> {
    let mut terminal = ratatui::init();
    let result = run(&mut terminal);
    ratatui::restore();
    result
}

fn run(terminal: &mut ratatui::DefaultTerminal) -> io::Result<()> {
    let mut app = App::new();

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
                match key.code {
                    KeyCode::Char('q') if app.step == Step::Results => app.quit(),
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
                    KeyCode::Char(c) => app.push_char(c),
                    KeyCode::Backspace => app.pop_char(),
                    KeyCode::Enter => app.confirm(),
                    KeyCode::Esc => app.go_back(),
                    _ => {}
                }
            }
        }

        if app.should_quit {
            break;
        }
    }

    Ok(())
}
