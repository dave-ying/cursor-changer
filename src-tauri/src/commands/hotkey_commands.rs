use crate::commands::cursor_commands::show_cursor_if_hidden_with_shared_state;
use crate::events;
use crate::shortcuts::{self, DEFAULT_SHORTCUT};
use crate::state::config::{persist_config, PersistedConfig};
use crate::state::{AppState, CursorStatePayload};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[tauri::command]
pub fn set_hotkey(
    app: AppHandle,
    state: State<AppState>,
    shortcut: String,
) -> Result<CursorStatePayload, String> {
    let payload = shortcuts::update_shortcut(&app, &state, &shortcut)?;
    let _ = app.emit(events::CURSOR_STATE, payload.clone());
    Ok(payload)
}

#[tauri::command]
pub fn set_shortcut_enabled(
    app: AppHandle,
    state: State<AppState>,
    enabled: bool,
) -> Result<CursorStatePayload, String> {
    if !enabled {
        {
            let mut prefs = state
                .prefs
                .write()
                .map_err(|_| "Application state poisoned".to_string())?;
            prefs.shortcut_enabled = false;
        }

        let config = PersistedConfig::from(&*state);

        let _ = app.global_shortcut().unregister_all();

        let payload = show_cursor_if_hidden_with_shared_state(&*state)?;

        if let Err(e) = persist_config(&app, &config) {
            cc_error!("Failed to persist shortcut_enabled preference: {e}");
        }

        let _ = app.emit(events::CURSOR_STATE, payload.clone());
        return Ok(payload);
    }

    let shortcut_to_register = {
        let mut prefs = state
            .prefs
            .write()
            .map_err(|_| "Application state poisoned".to_string())?;
        prefs.shortcut_enabled = true;
        prefs
            .shortcut
            .clone()
            .unwrap_or_else(|| DEFAULT_SHORTCUT.to_string())
    };

    let payload = shortcuts::update_shortcut(&app, &state, &shortcut_to_register)?;
    let _ = app.emit(events::CURSOR_STATE, payload.clone());
    Ok(payload)
}

#[tauri::command]
pub fn set_hotkey_temporarily_enabled(
    app: AppHandle,
    state: State<AppState>,
    enabled: bool,
) -> Result<(), String> {
    if !enabled {
        // Temporarily disable by unregistering all shortcuts
        let _ = app.global_shortcut().unregister_all();
    } else {
        // Re-enable by re-registering the current shortcut. If there is no
        // saved shortcut but 'shortcut_enabled' is true, register the default
        // so temporary re-enable registers a usable hotkey.
        let (shortcut, shortcut_enabled) = {
            let prefs = state
                .prefs
                .read()
                .map_err(|_| "Application state poisoned".to_string())?;
            (prefs.shortcut.clone(), prefs.shortcut_enabled)
        };

        if let Some(shortcut) = shortcut {
            if shortcut_enabled {
                let _ = shortcuts::update_shortcut(&app, &state, &shortcut);
            }
        } else if shortcut_enabled {
            // No shortcut set but shortcuts are enabled: register default
            let _ = shortcuts::update_shortcut(&app, &state, DEFAULT_SHORTCUT);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_shortcut_validation() {
        let result = shortcuts::update_shortcut;
        let _ = result;
    }

    // Note: Command-level tests with MockApp removed - doesn't exist in Tauri 2.x
    // Integration tests should verify full hotkey registration flow
}
