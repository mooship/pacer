use serde::{Deserialize, Serialize};
use std::io;
use std::path::PathBuf;

pub const DEFAULT_QUANTUM: i64 = 5000;
pub const DEFAULT_PAYDAY: i64 = 1;
pub const DEFAULT_INTERVAL: i64 = 7;

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Config {
    pub quantum: i64,
    pub payday: i64,
    pub interval: i64,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            quantum: DEFAULT_QUANTUM,
            payday: DEFAULT_PAYDAY,
            interval: DEFAULT_INTERVAL,
        }
    }
}

impl Config {
    pub fn sanitized(self) -> Config {
        Config {
            quantum: self.quantum.max(1),
            payday: self.payday.rem_euclid(7),
            interval: self.interval.clamp(1, 366),
        }
    }

    pub fn path() -> Option<PathBuf> {
        Some(dirs::config_dir()?.join("pacer").join("config.toml"))
    }

    pub fn load() -> (Config, Option<String>) {
        let Some(path) = Config::path() else {
            return (Config::default(), None);
        };
        let Ok(body) = std::fs::read_to_string(&path) else {
            return (Config::default(), None);
        };
        match toml::from_str::<Config>(&body) {
            Ok(parsed) => (parsed.sanitized(), None),
            Err(_) => (
                Config::default(),
                Some("config.toml is invalid; using defaults".into()),
            ),
        }
    }

    pub fn save(&self) -> io::Result<()> {
        let path = Config::path()
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "no config directory"))?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let body = toml::to_string_pretty(self).map_err(io::Error::other)?;
        std::fs::write(path, body)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitized_clamps_out_of_range() {
        let c = Config {
            quantum: 0,
            payday: 9,
            interval: 999,
        }
        .sanitized();
        assert_eq!(c.quantum, 1);
        assert_eq!(c.payday, 2);
        assert_eq!(c.interval, 366);

        let c = Config {
            quantum: -100,
            payday: -1,
            interval: 0,
        }
        .sanitized();
        assert_eq!(c.quantum, 1);
        assert_eq!(c.payday, 6);
        assert_eq!(c.interval, 1);
    }

    #[test]
    fn default_round_trips_through_toml() {
        let c = Config::default();
        let body = toml::to_string_pretty(&c).unwrap();
        let back: Config = toml::from_str(&body).unwrap();
        assert_eq!(c, back);
    }

    #[test]
    fn partial_toml_fills_defaults() {
        let back: Config = toml::from_str("payday = 5\n").unwrap();
        assert_eq!(back.payday, 5);
        assert_eq!(back.quantum, DEFAULT_QUANTUM);
        assert_eq!(back.interval, DEFAULT_INTERVAL);
    }

    #[test]
    fn invalid_toml_warns_and_uses_defaults() {
        let parsed: Config = toml::from_str("payday = \"oops\"\n").unwrap_or_default();
        assert_eq!(parsed, Config::default());
    }
}
