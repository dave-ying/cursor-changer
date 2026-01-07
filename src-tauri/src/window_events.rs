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

/// Check if window is abnormally small (bug state) and correct it.
fn ensure_minimum_window_size(window: &tauri::Window) {
    // If explicitly minimized, do not interfere, as dimensions might be reported as 0
    if window.is_minimized().unwrap_or(false) {
        return;
    }

    if let Ok(size) = window.inner_size() {
        // If width or height is impossibly small (e.g. < 200px), it's likely the restore bug.
        // We catch this and force a restore to a sensible default.
        if size.width < 200 || size.height < 200 {
            cc_debug!(
                "[CursorChanger] Abnormally small window detected ({:?}). forcing restore...",
                size
            );

            // Force to a safe default size (1280x720)
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
                width: 1280.0,
                height: 720.0,
            }));

            // Ensure window is visible and not minimized
            let _ = window.unminimize();
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

/// Handle window resize events and minimize to tray if enabled.
///
/// # Arguments
/// * `window` - The Tauri window that was resized
pub fn handle_window_resized(window: &tauri::Window) {
    // First, check for the "tiny window" bug and fix it if present
    ensure_minimum_window_size(window);

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
        tauri::WindowEvent::Focused(focused) => {
            // Also check on focus, as this covers the "user clicks taskbar icon" case
            if *focused {
                ensure_minimum_window_size(window);
            }
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
