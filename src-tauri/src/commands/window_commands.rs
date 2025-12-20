use crate::commands::{settings_commands, shutdown};
use crate::state::{AppState, CursorStatePayload, DefaultCursorStyle, MinimizePreference};
use crate::window::visibility;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn set_run_on_startup(
    app: AppHandle,
    state: State<AppState>,
    enable: bool,
) -> Result<CursorStatePayload, String> {
    settings_commands::set_run_on_startup(app, state, enable)
}

#[tauri::command]
pub fn set_minimize_to_tray(
    app: AppHandle,
    state: State<AppState>,
    preference: State<MinimizePreference>,
    enable: bool,
) -> Result<CursorStatePayload, String> {
    settings_commands::set_minimize_to_tray(app, state, preference, enable)
}

#[tauri::command]
pub fn set_accent_color(
    app: AppHandle,
    state: State<AppState>,
    color: String,
) -> Result<CursorStatePayload, String> {
    settings_commands::set_accent_color(app, state, color)
}

#[tauri::command]
pub fn set_default_cursor_style(
    app: AppHandle,
    state: State<AppState>,
    style: DefaultCursorStyle,
) -> Result<CursorStatePayload, String> {
    settings_commands::set_default_cursor_style(app, state, style)
}

#[tauri::command]
pub fn reset_all_settings(
    app: AppHandle,
    state: State<AppState>,
    preference: State<MinimizePreference>,
) -> Result<CursorStatePayload, String> {
    settings_commands::reset_all_settings(app, state, preference)
}

#[tauri::command]
pub fn reset_window_size_to_default(app: AppHandle) -> Result<(), String> {
    crate::window_setup::reset_main_window_size(&app)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    shutdown::quit_app(app)
}

pub fn quit_app_graceful(app: AppHandle) {
    shutdown::quit_app_graceful(app)
}

pub fn restore_state(state: &mut AppState) -> bool {
    shutdown::restore_state(state)
}

pub fn restore_on_exit(app: &AppHandle) {
    shutdown::restore_on_exit(app)
}

pub fn show_main_window(app: &AppHandle) {
    visibility::show_main_window(app)
}

// MockApp tests disabled - removed in Tauri 2.x
// TODO: Rewrite command tests as integration tests or direct unit tests
