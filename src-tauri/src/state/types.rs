use crate::state::AppState;
use crate::state::{DefaultCursorStyle, ThemeMode};
use serde::Serialize;
use std::collections::HashMap;

#[derive(ts_rs::TS, Serialize, Clone, Debug)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct CursorStatePayload {
    pub hidden: bool,
    pub shortcut: Option<String>,
    pub shortcut_enabled: bool,
    pub app_shortcut: Option<String>,
    pub app_shortcut_enabled: bool,
    pub app_enabled: bool,
    pub minimize_to_tray: bool,
    pub run_on_startup: bool,
    pub cursor_size: i32,
    // Path to the last-loaded cursor file (if a bulk or single cursor was applied)
    pub last_loaded_cursor_path: Option<String>,
    // In-memory map of cursor name -> image path (for UI previews)
    pub cursor_paths: HashMap<String, String>,
    // User-selected accent color for UI elements
    pub accent_color: String,
    // Theme mode: "light", "dark", or "system"
    pub theme_mode: ThemeMode,
    // Default cursor style: "windows"
    pub default_cursor_style: DefaultCursorStyle,
}

impl TryFrom<&AppState> for CursorStatePayload {
    type Error = String;

    fn try_from(state: &AppState) -> Result<Self, Self::Error> {
        let guard = state.read_all()?;

        Ok(Self {
            hidden: guard.cursor.hidden,
            shortcut: guard.prefs.shortcut.clone(),
            shortcut_enabled: guard.prefs.shortcut_enabled,
            app_shortcut: guard.prefs.app_shortcut.clone(),
            app_shortcut_enabled: guard.prefs.app_shortcut_enabled,
            app_enabled: guard.prefs.app_enabled,
            minimize_to_tray: guard.prefs.minimize_to_tray,
            run_on_startup: guard.prefs.run_on_startup,
            cursor_size: guard.prefs.cursor_size,
            last_loaded_cursor_path: guard.cursor.last_loaded_cursor_path.clone(),
            cursor_paths: guard.cursor.cursor_paths.clone(),
            accent_color: guard.prefs.accent_color.clone(),
            theme_mode: guard.prefs.theme_mode,
            default_cursor_style: guard.prefs.default_cursor_style,
        })
    }
}

#[allow(dead_code)]
#[derive(ts_rs::TS, Serialize)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct CursorClickPointInfo {
    pub data_url: String,
    pub click_point_x: u16,
    pub click_point_y: u16,
    pub width: u16,
    pub height: u16,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::AppState;

    #[test]
    fn cursor_state_payload_from_app_state() {
        let mut state = AppState::default();
        {
            let mut cursor = state.cursor.write().unwrap();
            cursor.hidden = true;
        }
        {
            let mut prefs = state.prefs.write().unwrap();
            prefs.shortcut = Some("Ctrl+Shift+X".to_string());
            prefs.shortcut_enabled = true;
            prefs.minimize_to_tray = false;
            prefs.run_on_startup = false;
            prefs.cursor_size = 64;
            prefs.accent_color = "#7c3aed".to_string();
            prefs.theme_mode = ThemeMode::System;
            prefs.default_cursor_style = DefaultCursorStyle::Windows;
        }

        let payload = CursorStatePayload::try_from(&state).expect("Application state poisoned");
        assert_eq!(payload.hidden, true);
        assert_eq!(payload.shortcut, Some("Ctrl+Shift+X".to_string()));
        assert_eq!(payload.minimize_to_tray, false);
        assert_eq!(payload.cursor_size, 64);
        assert_eq!(payload.default_cursor_style, DefaultCursorStyle::Windows);
    }
}
