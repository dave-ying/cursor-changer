use tauri::{AppHandle, Emitter, Runtime, State};

use crate::events;
use crate::state::config::{persist_config, PersistedConfig};
use crate::state::{AppState, CursorStatePayload};

fn build_payload_and_config(
    guard: &crate::state::app_state::AppStateWriteGuard<'_>,
    persist: bool,
) -> (CursorStatePayload, Option<PersistedConfig>) {
    let config = if persist {
        Some(PersistedConfig {
            shortcut: guard.prefs.shortcut.clone(),
            shortcut_enabled: Some(guard.prefs.shortcut_enabled),
            app_shortcut: guard.prefs.app_shortcut.clone(),
            app_shortcut_enabled: Some(guard.prefs.app_shortcut_enabled),
            app_enabled: Some(guard.prefs.app_enabled),
            minimize_to_tray: Some(guard.prefs.minimize_to_tray),
            run_on_startup: Some(guard.prefs.run_on_startup),
            cursor_size: Some(guard.prefs.cursor_size),
            accent_color: Some(guard.prefs.accent_color.clone()),
            theme_mode: Some(guard.prefs.theme_mode),
            default_cursor_style: Some(guard.prefs.default_cursor_style),
            customization_mode: Some(guard.modes.customization_mode),
        })
    } else {
        None
    };

    let payload = CursorStatePayload {
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
    };

    (payload, config)
}

pub fn update_state<F, R: Runtime>(
    app: &AppHandle<R>,
    state: &State<AppState>,
    persist: bool,
    f: F,
) -> Result<CursorStatePayload, String>
where
    F: FnOnce(&mut crate::state::app_state::AppStateWriteGuard<'_>) -> Result<(), String>,
{
    let (payload, config) = {
        let mut guard = state.write_all()?;
        f(&mut guard)?;

        build_payload_and_config(&guard, persist)
    };

    if let Some(config) = config {
        if let Err(e) = persist_config(app, &config) {
            cc_error!("Failed to persist preferences: {e}");
        }
    }

    Ok(payload)
}

pub fn update_state_and_emit<F, R: Runtime>(
    app: &AppHandle<R>,
    state: &State<AppState>,
    persist: bool,
    f: F,
) -> Result<CursorStatePayload, String>
where
    F: FnOnce(&mut crate::state::app_state::AppStateWriteGuard<'_>) -> Result<(), String>,
{
    let payload = update_state(app, state, persist, f)?;
    let _ = app.emit(events::CURSOR_STATE, payload.clone());
    Ok(payload)
}

pub fn update_state_with_result<F, Res, R: Runtime>(
    app: &AppHandle<R>,
    state: &State<AppState>,
    persist: bool,
    f: F,
) -> Result<(CursorStatePayload, Res), String>
where
    F: FnOnce(&mut crate::state::app_state::AppStateWriteGuard<'_>) -> Result<Res, String>,
{
    let ((payload, result), config) = {
        let mut guard = state.write_all()?;
        let result = f(&mut guard)?;

        let (payload, config) = build_payload_and_config(&guard, persist);

        ((payload, result), config)
    };

    if let Some(config) = config {
        if let Err(e) = persist_config(app, &config) {
            cc_error!("Failed to persist preferences: {e}");
        }
    }

    Ok((payload, result))
}

pub fn update_state_and_emit_with_result<F, Res, R: Runtime>(
    app: &AppHandle<R>,
    state: &State<AppState>,
    persist: bool,
    f: F,
) -> Result<(CursorStatePayload, Res), String>
where
    F: FnOnce(&mut crate::state::app_state::AppStateWriteGuard<'_>) -> Result<Res, String>,
{
    let (payload, result) = update_state_with_result(app, state, persist, f)?;
    let _ = app.emit(events::CURSOR_STATE, payload.clone());
    Ok((payload, result))
}

#[allow(dead_code)]
pub fn emit_state<R: Runtime>(app: &AppHandle<R>, state: &State<AppState>) -> Result<CursorStatePayload, String> {
    let payload = CursorStatePayload::try_from(&**state)?;

    let _ = app.emit(events::CURSOR_STATE, payload.clone());
    Ok(payload)
}
