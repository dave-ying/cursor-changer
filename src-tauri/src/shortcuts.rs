use crate::commands::cursor_commands::{toggle_app_enabled_internal, toggle_cursor_with_shared_state};
use crate::events;
use crate::state::config::{persist_config, PersistedConfig};
use crate::state::{AppState, CursorStatePayload};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

/// Default application keyboard shortcut used for hide/show cursor
pub use crate::state::app_state::{DEFAULT_APP_SHORTCUT, DEFAULT_SHORTCUT};

fn register_shortcut_callback<F>(
    app: &AppHandle,
    trimmed: &str,
    callback: F,
) -> Result<(), String>
where
    F: Fn() + Send + Sync + 'static,
{
    let app_for_hotkey = app.clone();
    match app
        .global_shortcut()
        .on_shortcut(trimmed, move |_app, _shortcut, event| {
            if event.state != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                return;
            }
            callback();
        }) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to register shortcut '{}': {}", trimmed, e)),
    }
}

/// Register or update the global keyboard shortcut for cursor toggling.
///
/// This function:
/// 1. Unregisters all existing shortcuts
/// 2. Parses and validates the new shortcut string
/// 3. Sets up the callback handler for the shortcut
/// 4. Updates the application state
/// 5. Persists the new shortcut to disk
///
/// # Arguments
/// * `app` - The Tauri application handle
/// * `state` - The shared application state
/// * `shortcut` - The shortcut string (e.g., "Ctrl+Shift+X")
///
/// # Returns
/// * `Ok(CursorStatePayload)` - Updated state payload on success
/// * `Err(String)` - Error message on failure
pub fn update_shortcut(
    app: &AppHandle,
    state: &State<AppState>,
    shortcut: &str,
) -> Result<CursorStatePayload, String> {
    let trimmed = shortcut.trim();
    if trimmed.is_empty() {
        return Err("Shortcut cannot be empty".into());
    }

    // Try to unregister all shortcuts, but don't fail if there's an error
    let _ = app.global_shortcut().unregister_all();

    let _shortcut_obj: Shortcut = trimmed.parse().map_err(|e| format!("{:?}", e))?;

    let app_for_hotkey = app.clone();

    // Set up the callback handler first - but don't fail if it's already registered
    match app
        .global_shortcut()
        .on_shortcut(trimmed, move |_app, _shortcut, event| {
            // Only trigger on key press (KeyDown), not key release or repeat
            if event.state != tauri_plugin_global_shortcut::ShortcutState::Pressed {
                return;
            }

            let payload = app_for_hotkey.try_state::<AppState>().and_then(|shared| {
                match toggle_cursor_with_shared_state(&shared) {
                    Ok(payload) => Some(payload),
                    Err(err) => {
                        let _ = app_for_hotkey.emit(events::CURSOR_ERROR, err);
                        None
                    }
                }
            });

            if let Some(payload) = payload {
                let _ = app_for_hotkey.emit(events::CURSOR_STATE, payload);
            }
        }) {
        Ok(_) => {}
        Err(e) => {
            // Note: If on_shortcut fails, the shortcut won't work at all
            return Err(format!("Failed to register shortcut '{}': {}", trimmed, e));
        }
    }

    {
        let mut prefs = state
            .prefs
            .write()
            .map_err(|_| "Application state poisoned".to_string())?;
        prefs.shortcut = Some(trimmed.to_string());
    }

    let config = PersistedConfig::from(&**state);
    let payload = CursorStatePayload::try_from(&**state)?;

    // Persist the chosen shortcut and preferences to disk
    if let Err(e) = persist_config(app, &config) {
        cc_error!("Failed to persist preferences: {e}");
    }

    Ok(payload)
}

/// Initialize the global keyboard shortcut during application startup.
///
/// This function loads the persisted shortcut preference (if any), applies
/// migration logic for old defaults, and registers the shortcut with the system
/// if shortcuts are enabled.
///
/// # Arguments
/// * `app` - The Tauri application handle
/// * `state` - The shared application state
/// * `persisted_shortcut` - Optional persisted shortcut string from config
/// * `shortcut_enabled` - Whether shortcuts should be registered (default: true)
pub fn initialize_shortcut(
    app: &AppHandle,
    state: &State<AppState>,
    persisted_shortcut: Option<String>,
    shortcut_enabled: bool,
) {
    // If shortcuts are disabled, don't register anything
    if !shortcut_enabled {
        cc_debug!("[shortcuts] Shortcuts are disabled, skipping registration");
        return;
    }

    match persisted_shortcut {
        Some(ref s) => {
            // Migrate old defaults to new default (Ctrl+Shift+X)
            let shortcut_to_register = if s.trim() == "Ctrl+Shift+C" || s.trim() == "Ctrl+Shift+F9"
            {
                let new = "Ctrl+Shift+X".to_string();
                let config = if let Ok(mut prefs) = state.prefs.write() {
                    prefs.shortcut = Some(new.clone());
                    Some(PersistedConfig::from(&**state))
                } else {
                    None
                };

                if let Some(config) = config {
                    if let Err(e) = persist_config(app, &config) {
                        cc_error!("Failed to persist migrated shortcut: {e}");
                    }
                }
                new
            } else {
                s.clone()
            };

            if let Err(err) = update_shortcut(app, state, &shortcut_to_register) {
                cc_error!("Failed to register saved shortcut ({shortcut_to_register}): {err}");
            }
        }
        None => {
            if let Err(err) = update_shortcut(app, state, DEFAULT_SHORTCUT) {
                cc_error!("Failed to register default shortcut: {err}");
            }
        }
    }
}
