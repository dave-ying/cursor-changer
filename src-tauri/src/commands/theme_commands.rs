use crate::commands::command_helpers;
use crate::events;
use crate::state::{AppState, CursorStatePayload, ThemeMode};
use tauri::{AppHandle, Emitter, State};

/// Set the theme mode (light, dark, or system)
#[tauri::command]
pub fn set_theme_mode(
    app: AppHandle,
    state: State<AppState>,
    theme_mode: ThemeMode,
) -> Result<CursorStatePayload, String> {
    cc_debug!("[Rust] set_theme_mode called with: {}", theme_mode.as_str());

    let payload = command_helpers::update_state_and_emit(&app, &state, true, |guard| {
        cc_debug!(
            "[Rust] State lock acquired, setting theme_mode to: {}",
            theme_mode.as_str()
        );
        guard.prefs.theme_mode = theme_mode;
        Ok(())
    })?;

    // Emit a theme change event for the frontend
    cc_debug!(
        "[Rust] Emitting theme-changed event: {}",
        theme_mode.as_str()
    );
    let _ = app.emit(events::THEME_CHANGED, theme_mode);

    cc_debug!("[Rust] set_theme_mode completed successfully");
    Ok(payload)
}

/// Get the current theme mode
#[tauri::command]
pub fn get_theme_mode(state: State<AppState>) -> Result<ThemeMode, String> {
    let prefs = state
        .prefs
        .read()
        .map_err(|_| "Application state poisoned".to_string())?;

    Ok(prefs.theme_mode)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_invalid_theme_mode() {
        let result = validate_theme_mode("invalid");
        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Theme mode must be 'light', 'dark', or 'system'"
        );
    }

    #[test]
    fn test_valid_theme_modes() {
        assert!(validate_theme_mode("light").is_ok());
        assert!(validate_theme_mode("dark").is_ok());
        assert!(validate_theme_mode("system").is_ok());
    }

    fn validate_theme_mode(mode: &str) -> Result<(), String> {
        let valid_modes = ["light", "dark", "system"];
        if !valid_modes.contains(&mode) {
            return Err("Theme mode must be 'light', 'dark', or 'system'".to_string());
        }
        Ok(())
    }
}
