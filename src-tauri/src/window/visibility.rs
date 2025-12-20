use tauri::{AppHandle, Manager};

fn is_window_visibility_debug_enabled() -> bool {
    std::env::var("HCT_DEBUG_WINDOW_VISIBILITY")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

fn is_webview_console_debug_enabled() -> bool {
    std::env::var("TAURI_WEBVIEW_CONSOLE_DEBUG")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

/// Check if a window position is visible on any available monitor.
///
/// Returns true if the window's position intersects with any monitor's bounds.
/// This helps detect when a window has become off-screen due to monitor disconnection
/// or configuration changes.
fn is_window_on_screen(app: &AppHandle, window: &tauri::WebviewWindow) -> bool {
    // If the window isn't associated with any monitor, it's effectively off-screen.
    if let Ok(None) = window.current_monitor() {
        cc_debug_if!(
            is_window_visibility_debug_enabled(),
            "[CursorChanger] Window has no current monitor; treating as off-screen"
        );
        return false;
    }

    // Get window position and size
    let window_pos = match window.outer_position() {
        Ok(pos) => pos,
        Err(e) => {
            cc_error!("[CursorChanger] Failed to get window position: {}", e);
            return true; // Assume on-screen if we can't determine position
        }
    };

    let window_size = match window.outer_size() {
        Ok(size) => size,
        Err(e) => {
            cc_error!("[CursorChanger] Failed to get window size: {}", e);
            return true; // Assume on-screen if we can't determine size
        }
    };

    // Get all available monitors
    let monitors = match app.available_monitors() {
        Ok(monitors) => monitors,
        Err(e) => {
            cc_error!("[CursorChanger] Failed to get available monitors: {}", e);
            return true; // Assume on-screen if we can't get monitors
        }
    };

    if monitors.is_empty() {
        cc_error!("[CursorChanger] No monitors detected");
        return true; // Assume on-screen if no monitors found
    }

    // Convert window bounds to physical pixels for comparison
    let win_x = window_pos.x;
    let win_y = window_pos.y;
    let win_w = window_size.width as i32;
    let win_h = window_size.height as i32;

    // Minimized/hidden windows can report a near-zero size; treat that as off-screen so we recenter.
    if win_w <= 1 || win_h <= 1 {
        cc_debug_if!(
            is_window_visibility_debug_enabled(),
            "[CursorChanger] Window size is {},{} (likely minimized/hidden); treating as off-screen",
            win_w,
            win_h
        );
        return false;
    }

    cc_debug_if!(
        is_window_visibility_debug_enabled(),
        "[CursorChanger] Window position: {}x{}, size: {}x{}",
        win_x,
        win_y,
        win_w,
        win_h
    );

    // Check if window intersects with any monitor
    for monitor in monitors {
        let mon_pos = monitor.position();
        let mon_size = monitor.size();

        let mon_x = mon_pos.x;
        let mon_y = mon_pos.y;
        let mon_w = mon_size.width as i32;
        let mon_h = mon_size.height as i32;

        // Check if window intersects with this monitor
        // We need at least some portion of the window to be visible
        let intersects = !(win_x + win_w < mon_x || // Window is completely to the left
                          win_x > mon_x + mon_w || // Window is completely to the right
                          win_y + win_h < mon_y || // Window is completely above
                          win_y > mon_y + mon_h); // Window is completely below

        if intersects {
            cc_debug_if!(
                is_window_visibility_debug_enabled(),
                "[CursorChanger] Window is on monitor at {}x{} ({}x{})",
                mon_x,
                mon_y,
                mon_w,
                mon_h
            );
            return true;
        }
    }

    cc_debug_if!(
        is_window_visibility_debug_enabled(),
        "[CursorChanger] Window is OFF-SCREEN (not on any monitor)"
    );
    false
}

/// Center the window on the primary monitor.
///
/// This is used as a fallback when the window is detected to be off-screen.
fn center_window_on_primary_monitor(
    app: &AppHandle,
    window: &tauri::WebviewWindow,
) -> Result<(), String> {
    let monitor = app
        .primary_monitor()
        .map_err(|e| format!("Failed to get primary monitor: {}", e))?
        .ok_or_else(|| "No primary monitor found".to_string())?;

    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale = monitor.scale_factor();

    // Get window size
    let win_size = window
        .outer_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    // Calculate center position (in physical pixels)
    let win_w = win_size.width as i32;
    let win_h = win_size.height as i32;
    let mon_w = mon_size.width as i32;
    let mon_h = mon_size.height as i32;

    let center_x = mon_pos.x + (mon_w - win_w) / 2;
    let center_y = mon_pos.y + (mon_h - win_h) / 2;

    // Convert to logical pixels for set_position
    let logical_x = (center_x as f64) / scale;
    let logical_y = (center_y as f64) / scale;

    window
        .set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x: logical_x,
            y: logical_y,
        }))
        .map_err(|e| format!("Failed to set window position: {}", e))?;

    cc_debug_if!(
        is_window_visibility_debug_enabled(),
        "[CursorChanger] Centered window on primary monitor at logical {}x{}",
        logical_x,
        logical_y
    );
    Ok(())
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        cc_debug_if!(
            is_window_visibility_debug_enabled(),
            "[CursorChanger] show_main_window called"
        );

        // CRITICAL FIX: Check if window is on screen before showing
        // This prevents the window from being stuck off-screen on multi-monitor setups
        if !is_window_on_screen(app, &window) {
            cc_debug_if!(
                is_window_visibility_debug_enabled(),
                "[CursorChanger] Window is off-screen, centering on primary monitor"
            );
            if let Err(e) = center_window_on_primary_monitor(app, &window) {
                cc_error!("[CursorChanger] Failed to center window: {}", e);
                // Continue anyway - the window might still be recoverable
            }
        }

        // First ensure window is not minimized
        if let Ok(is_minimized) = window.is_minimized() {
            if is_minimized {
                cc_debug_if!(
                    is_window_visibility_debug_enabled(),
                    "[CursorChanger] Window is minimized, restoring"
                );
                let _ = window.unminimize();
            }
        }

        // Show the window (important if it was hidden to tray)
        match window.show() {
            Ok(_) => {
                cc_debug_if!(
                    is_window_visibility_debug_enabled(),
                    "[CursorChanger] Window shown successfully"
                );
            }
            Err(e) => cc_error!("[CursorChanger] Failed to show window: {}", e),
        }

        // Bring to front by briefly setting always-on-top then unsetting
        let _ = window.set_always_on_top(true);
        let _ = window.set_always_on_top(false);

        // Set focus to ensure window is active
        match window.set_focus() {
            Ok(_) => {
                cc_debug_if!(
                    is_window_visibility_debug_enabled(),
                    "[CursorChanger] Window focus set successfully"
                );
            }
            Err(e) => cc_error!("[CursorChanger] Failed to set focus: {}", e),
        }

        // Diagnostics: try a small JS eval to verify the webview is responsive.
        // If this fails, the webview engine (WebView2) may not have started or is unresponsive.
        if is_webview_console_debug_enabled() {
            match window.eval("console.log('CursorChanger: eval ping from Rust')") {
                Ok(_) => {
                    cc_debug_if!(
                        is_window_visibility_debug_enabled(),
                        "[CursorChanger] window.eval executed successfully"
                    );
                }
                Err(e) => cc_error!("[CursorChanger] window.eval failed: {}", e),
            }
        }
    } else {
        cc_error!("[CursorChanger] Failed to get main window");
    }
}
