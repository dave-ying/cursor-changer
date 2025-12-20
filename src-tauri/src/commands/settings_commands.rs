use crate::commands::command_helpers;
use crate::events;
use crate::startup;
use crate::state::app_state::{ModeCustomizationState, PreferencesState};
use crate::state::{AppState, CursorStatePayload, DefaultCursorStyle, MinimizePreference};
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub fn set_run_on_startup(
    app: AppHandle,
    state: State<AppState>,
    enable: bool,
) -> Result<CursorStatePayload, String> {
    let payload = command_helpers::update_state_and_emit(&app, &state, true, |guard| {
        cc_debug!(
            "[CursorChanger] set_run_on_startup called with enable={}",
            enable
        );
        guard.prefs.run_on_startup = enable;
        Ok(())
    })?;

    // Try to update the OS autostart registration; emit a cursor-error event on failure.
    match startup::set_autostart(enable, "CursorChanger", None) {
        Ok(_) => cc_debug!("[CursorChanger] Updated autostart registration: {}", enable),
        Err(e) => {
            cc_error!(
                "[CursorChanger] Failed to update autostart registration: {}",
                e
            );
            let _ = app.emit(
                events::CURSOR_ERROR,
                format!("Failed to update Run at startup: {}", e),
            );
        }
    }

    Ok(payload)
}

pub fn set_minimize_to_tray(
    app: AppHandle,
    state: State<AppState>,
    preference: State<MinimizePreference>,
    enable: bool,
) -> Result<CursorStatePayload, String> {
    command_helpers::update_state_and_emit(&app, &state, true, |guard| {
        cc_debug!(
            "[CursorChanger] set_minimize_to_tray called with enable={}",
            enable
        );
        guard.prefs.minimize_to_tray = enable;
        cc_debug!(
            "[CursorChanger] state.prefs.minimize_to_tray now={}",
            guard.prefs.minimize_to_tray
        );
        preference.0.store(enable, Ordering::SeqCst);
        cc_debug!(
            "[CursorChanger] MinimizePreference atomic now={}",
            preference.0.load(Ordering::SeqCst)
        );
        Ok(())
    })
}

pub fn set_accent_color(
    app: AppHandle,
    state: State<AppState>,
    color: String,
) -> Result<CursorStatePayload, String> {
    command_helpers::update_state_and_emit(&app, &state, true, |guard| {
        cc_debug!(
            "[CursorChanger] set_accent_color called with color={}",
            color
        );
        guard.prefs.accent_color = color;
        Ok(())
    })
}

pub fn set_default_cursor_style(
    app: AppHandle,
    state: State<AppState>,
    style: DefaultCursorStyle,
) -> Result<CursorStatePayload, String> {
    command_helpers::update_state_and_emit(&app, &state, true, |guard| {
        let old_style = guard.prefs.default_cursor_style;
        cc_debug!(
            "[CursorChanger] set_default_cursor_style called with style={} (was {})",
            style.as_str(),
            old_style.as_str()
        );

        if old_style != style {
            cc_debug!(
                "[CursorChanger] Cursor style changed, clearing stored cursor paths for both modes"
            );
            guard.modes.simple_mode_cursor_paths.clear();
            guard.modes.advanced_mode_cursor_paths.clear();
            guard.cursor.cursor_paths.clear();
        }

        guard.prefs.default_cursor_style = style;
        Ok(())
    })
}

pub fn reset_all_settings(
    app: AppHandle,
    state: State<AppState>,
    preference: State<MinimizePreference>,
) -> Result<CursorStatePayload, String> {
    cc_debug!("[CursorChanger] reset_all_settings called");

    // First, unregister all shortcuts before resetting state
    let _ = app.global_shortcut().unregister_all();

    let payload = command_helpers::update_state(&app, &state, true, |guard| {
        let hidden = guard.cursor.hidden;

        *guard.prefs = PreferencesState::default();
        *guard.modes = ModeCustomizationState::default();

        guard.cursor.cursor_paths.clear();
        guard.cursor.last_loaded_cursor_path = None;
        guard.cursor.hidden = hidden;

        preference
            .0
            .store(guard.prefs.minimize_to_tray, Ordering::SeqCst);

        Ok(())
    })?;

    // Register the shortcut if shortcut_enabled is true by default
    // so the runtime state matches persisted settings.
    if payload.shortcut_enabled {
        if let Some(shortcut) = payload.shortcut.clone() {
            if let Err(e) = crate::shortcuts::update_shortcut(&app, &state, &shortcut) {
                cc_error!("Failed to register shortcut after reset: {e}");
            }
        }
    }

    // Reset autostart
    match startup::set_autostart(false, "CursorChanger", None) {
        Ok(_) => cc_debug!("[CursorChanger] Reset autostart to disabled"),
        Err(e) => cc_error!("[CursorChanger] Failed to reset autostart: {}", e),
    }

    // Apply app default cursors to ensure the system has cursors
    // This is the key fix - without this, the cursor size slider won't work
    // Note: We emit a special event to tell the frontend to also call reset_current_mode_cursors
    // to avoid state locking issues
    let _ = app.emit(events::RESET_CURSORS_AFTER_SETTINGS, payload.clone());

    let _ = app.emit(events::CURSOR_STATE, payload.clone());
    Ok(payload)
}
