use crate::commands::shutdown;
use crate::state::AppState;
use crate::window::visibility;
use tauri::AppHandle;

#[tauri::command]
pub fn reset_window_size_to_default(app: AppHandle) -> Result<(), String> {
    crate::window_setup::reset_main_window_size(&app)
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    shutdown::quit_app(app)
}

#[allow(dead_code)]
pub fn quit_app_graceful(app: AppHandle) {
    shutdown::quit_app_graceful(app)
}

#[allow(dead_code)]
pub fn restore_state(state: &mut AppState) -> bool {
    shutdown::restore_state(state)
}



pub fn show_main_window(app: &AppHandle) {
    visibility::show_main_window(app)
}

// MockApp tests disabled - removed in Tauri 2.x
// TODO: Rewrite command tests as integration tests or direct unit tests
