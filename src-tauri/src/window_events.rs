use crate::state::MinimizePreference;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Manager};

/// Determine if the window should minimize to tray based on user preference.
///
/// # Arguments
/// * `app` - The Tauri application handle
///
/// # Returns
/// * `Some(bool)` - The user's minimize preference
/// * `None` - Preference state not available
pub fn should_minimize_to_tray(app: &AppHandle) -> Option<bool> {
    let pref = app
        .try_state::<MinimizePreference>()
        .map(|p| p.0.load(Ordering::SeqCst));
    if let Some(v) = pref {
        cc_debug!("[CursorChanger] should_minimize_to_tray -> {}", v);
    } else {
        cc_debug!("[CursorChanger] should_minimize_to_tray -> <no preference state>");
    }
    pref
}

/// Handle window resize events and minimize to tray if enabled.
///
/// # Arguments
/// * `window` - The Tauri window that was resized
pub fn handle_window_resized(window: &tauri::Window) {
    if let Ok(true) = window.is_minimized() {
        let app_handle = window.app_handle();
        if should_minimize_to_tray(&app_handle).unwrap_or(false) {
            let _ = window.hide();
        }
    }
}

pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    match event {
        tauri::WindowEvent::Resized(_) => {
            handle_window_resized(window);
        }
        tauri::WindowEvent::CloseRequested { api, .. } => {
            api.prevent_close();
            let app_handle = window.app_handle().clone();
            if should_minimize_to_tray(&app_handle).unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = std::thread::spawn(move || {
                    crate::commands::shutdown::request_exit(app_handle);
                });
            }
        }
        _ => {}
    }
}
