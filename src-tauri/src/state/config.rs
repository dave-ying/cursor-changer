use super::app_state::AppState;
use super::models::{CustomizationMode, DefaultCursorStyle, ThemeMode};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager, Runtime};

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct PersistedConfig {
    pub shortcut: Option<String>,
    pub shortcut_enabled: Option<bool>,
    pub app_shortcut: Option<String>,
    pub app_shortcut_enabled: Option<bool>,
    pub app_enabled: Option<bool>,
    pub minimize_to_tray: Option<bool>,
    pub run_on_startup: Option<bool>,
    pub cursor_size: Option<i32>,
    pub accent_color: Option<String>,
    #[serde(default, deserialize_with = "deserialize_theme_mode_opt")]
    pub theme_mode: Option<ThemeMode>,
    #[serde(default, deserialize_with = "deserialize_default_cursor_style_opt")]
    pub default_cursor_style: Option<DefaultCursorStyle>,
    #[serde(default, deserialize_with = "deserialize_customization_mode_opt")]
    pub customization_mode: Option<CustomizationMode>,
}

fn deserialize_theme_mode_opt<'de, D>(deserializer: D) -> Result<Option<ThemeMode>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    Ok(opt.map(|s| ThemeMode::from_str(&s).unwrap_or_default()))
}

fn deserialize_default_cursor_style_opt<'de, D>(
    deserializer: D,
) -> Result<Option<DefaultCursorStyle>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    Ok(opt.map(|s| DefaultCursorStyle::from_str(&s).unwrap_or_default()))
}

fn deserialize_customization_mode_opt<'de, D>(
    deserializer: D,
) -> Result<Option<CustomizationMode>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<String>::deserialize(deserializer)?;
    Ok(opt.map(|s| CustomizationMode::from_str(&s).unwrap_or_default()))
}

impl From<&AppState> for PersistedConfig {
    fn from(state: &AppState) -> Self {
        let prefs = state.prefs.read().expect("Application state poisoned");
        let modes = state.modes.read().expect("Application state poisoned");
        PersistedConfig {
            shortcut: prefs.shortcut.clone(),
            shortcut_enabled: Some(prefs.shortcut_enabled),
            app_shortcut: prefs.app_shortcut.clone(),
            app_shortcut_enabled: Some(prefs.app_shortcut_enabled),
            app_enabled: Some(prefs.app_enabled),
            minimize_to_tray: Some(prefs.minimize_to_tray),
            run_on_startup: Some(prefs.run_on_startup),
            cursor_size: Some(prefs.cursor_size),
            accent_color: Some(prefs.accent_color.clone()),
            theme_mode: Some(prefs.theme_mode),
            default_cursor_style: Some(prefs.default_cursor_style),
            customization_mode: Some(modes.customization_mode),
        }
    }
}

pub fn config_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|e| e.to_string())
        .map(|p| p.join("cursor-changer"))
}

pub fn persist_config<R: Runtime>(app: &AppHandle<R>, config: &PersistedConfig) -> Result<(), String> {
    let dir = config_path(app)?;
    write_config(&dir, config)
}

// Helper that writes a PersistedConfig to the given directory path (creates dir if needed).
pub fn write_config(dir: &PathBuf, config: &PersistedConfig) -> Result<(), String> {
    if !dir.exists() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }

    let file = dir.join("config.json");
    let serialized = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&file, serialized).map_err(|e| e.to_string())
}

#[allow(dead_code)]
pub fn persist_preferences<R: Runtime>(app: &AppHandle<R>, state: &AppState) -> Result<(), String> {
    persist_config(app, &PersistedConfig::from(state))
}

pub fn load_persisted_config<R: Runtime>(app: &AppHandle<R>) -> Result<PersistedConfig, String> {
    let dir = config_path(app)?;
    let file = dir.join("config.json");
    if !file.exists() {
        return Ok(PersistedConfig::default());
    }

    let s = fs::read_to_string(&file).map_err(|e| e.to_string())?;

    // Older releases might have stored only the shortcut field; default missing values.
    let config: PersistedConfig = serde_json::from_str(&s).map_err(|e| e.to_string())?;
    let config = normalize_persisted_config(config);

    cc_debug!("[cursor-changer] Loaded persisted config: {:?}", config);

    Ok(config)
}

// Normalize persisted config values to provide sane defaults for older releases.
pub fn normalize_persisted_config(mut config: PersistedConfig) -> PersistedConfig {
    fn fill_nulls(target: &mut serde_json::Value, defaults: &serde_json::Value) {
        match (target, defaults) {
            (serde_json::Value::Object(target_map), serde_json::Value::Object(defaults_map)) => {
                for (k, v_default) in defaults_map {
                    match target_map.get_mut(k) {
                        Some(v_target) => {
                            if v_target.is_null() {
                                *v_target = v_default.clone();
                            } else {
                                fill_nulls(v_target, v_default);
                            }
                        }
                        None => {
                            target_map.insert(k.clone(), v_default.clone());
                        }
                    }
                }
            }
            _ => {}
        }
    }

    let defaults = PersistedConfig::from(&AppState::default());

    let mut config_value = serde_json::to_value(&mut config).expect("serialize persisted config");
    let defaults_value = serde_json::to_value(defaults).expect("serialize defaults");

    fill_nulls(&mut config_value, &defaults_value);
    serde_json::from_value(config_value).expect("deserialize normalized persisted config")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_defaults_match_app_state_defaults() {
        let normalized = normalize_persisted_config(PersistedConfig::default());
        let from_state = PersistedConfig::from(&AppState::default());

        assert_eq!(normalized.shortcut, from_state.shortcut);
        assert_eq!(normalized.shortcut_enabled, from_state.shortcut_enabled);
        assert_eq!(normalized.minimize_to_tray, from_state.minimize_to_tray);
        assert_eq!(normalized.run_on_startup, from_state.run_on_startup);
        assert_eq!(normalized.cursor_size, from_state.cursor_size);
        assert_eq!(normalized.accent_color, from_state.accent_color);
        assert_eq!(normalized.theme_mode, from_state.theme_mode);
        assert_eq!(
            normalized.default_cursor_style,
            from_state.default_cursor_style
        );
    }
}
