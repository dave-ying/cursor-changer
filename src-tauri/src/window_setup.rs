use tauri::{AppHandle, Manager, WebviewWindow};

fn is_webview_console_debug_enabled() -> bool {
    std::env::var("TAURI_WEBVIEW_CONSOLE_DEBUG")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

/// Open the developer tools in debug builds when explicitly enabled via environment variable.
///
/// This function only opens DevTools when `TAURI_OPEN_DEVTOOLS_ON_STARTUP=1` or `true`
/// to avoid intrusive automatic opening on every development run.
#[cfg(debug_assertions)]
fn try_open_devtools(win: &WebviewWindow) {
    let open = std::env::var("TAURI_OPEN_DEVTOOLS_ON_STARTUP")
        .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if open {
        let _ = win.open_devtools();
        cc_debug!("[CursorChanger] startup opened devtools (env enabled)");
    } else {
        cc_debug!("[CursorChanger] startup devtools auto-open skipped (set TAURI_OPEN_DEVTOOLS_ON_STARTUP=1 to enable)");
    }
}

#[cfg(not(debug_assertions))]
fn try_open_devtools(_win: &WebviewWindow) {
    // No-op in release builds
}

/// Initialize and configure the main application window.
///
/// This function:
/// 1. Logs the window URL for diagnostics
/// 2. Injects a development server redirect probe (debug builds only)
/// 3. Injects SVG rendering debug scripts
/// 4. Calculates and applies optimal window size (16:9 aspect ratio)
/// 5. Centers the window on the primary monitor
/// 6. Opens developer tools if requested (debug builds only)
/// 7. Sets window focus
///
/// # Arguments
/// * `app` - The Tauri application handle
pub fn initialize_main_window(app: &AppHandle) {
    let Some(win) = app.get_webview_window("main") else {
        cc_error!("[CursorChanger] main window missing at setup");
        return;
    };

    cc_debug!("[CursorChanger] main window exists at setup");

    // Log the webview URL
    if let Ok(url) = win.url() {
        cc_debug!("[CursorChanger] Window URL: {}", url);
    } else {
        cc_error!("[CursorChanger] Failed to get window URL");
    }

    // Ensure window is visible
    match win.show() {
        Ok(_) => cc_debug!("[CursorChanger] Window explicitly shown"),
        Err(e) => cc_error!("[CursorChanger] Failed to show window: {}", e),
    }

    // Diagnostic eval to verify webview is responsive
    if is_webview_console_debug_enabled() {
        match win.eval("console.log('CursorChanger: startup eval ping')") {
            Ok(_) => cc_debug!("[CursorChanger] startup window.eval executed successfully"),
            Err(e) => cc_error!("[CursorChanger] startup window.eval failed: {}", e),
        }
    }

    // Inject development server redirect probe (debug builds only) - DISABLED
    inject_dev_server_redirect(&win);

    // Inject SVG rendering debug scripts
    inject_svg_debug_script(&win);

    // Calculate and apply optimal window size
    apply_optimal_window_size(app, &win);

    // Default to maximized window on startup
    match win.maximize() {
        Ok(_) => cc_debug!("[CursorChanger] Window maximized on startup"),
        Err(e) => cc_error!("[CursorChanger] Failed to maximize window on startup: {}", e),
    }

    // Open developer tools if requested (debug builds only)
    try_open_devtools(&win);

    // Set window focus
    match win.set_focus() {
        Ok(_) => cc_debug!("[CursorChanger] startup Window focus set successfully"),
        Err(e) => cc_error!("[CursorChanger] startup Failed to set focus: {}", e),
    }
}

pub fn reset_main_window_size(app: &AppHandle) -> Result<(), String> {
    let Some(win) = app.get_webview_window("main") else {
        return Err("main window missing".to_string());
    };

    match win.is_maximized() {
        Ok(true) => {
            let _ = win.unmaximize();
        }
        Ok(false) => {}
        Err(_) => {}
    }

    apply_optimal_window_size(app, &win);
    match win.maximize() {
        Ok(_) => cc_debug!("[CursorChanger] Window maximized after reset"),
        Err(e) => cc_error!("[CursorChanger] Failed to maximize window after reset: {}", e),
    }
    Ok(())
}

/// Inject a script to redirect to the Vite dev server if it's running (debug builds only).
/// NOTE: This is disabled because Tauri already loads from devUrl in tauri.conf.json.
/// The redirect was causing window visibility issues.
#[cfg(debug_assertions)]
fn inject_dev_server_redirect(win: &WebviewWindow) {
    // Disabled - Tauri already handles dev server loading via tauri.conf.json devUrl
    let _ = win; // Suppress unused variable warning
    cc_debug!("[CursorChanger] Dev-server redirect probe skipped (Tauri handles devUrl)");
}

#[cfg(not(debug_assertions))]
fn inject_dev_server_redirect(_win: &WebviewWindow) {
    // No-op in release builds
}

/// Inject debugging scripts to inspect SVG rendering in the titlebar.
fn inject_svg_debug_script(win: &WebviewWindow) {
    if !is_webview_console_debug_enabled() {
        return;
    }

    let debug_script = r#"
        setTimeout(() => {
            console.log('[Rust-Injected-Debug] Checking titlebar SVGs...');
            const svgs = document.querySelectorAll('.titlebar-button svg');
            console.log('[Rust-Injected-Debug] Found SVG count:', svgs.length);
            svgs.forEach((svg, idx) => {
                const computed = window.getComputedStyle(svg);
                const path = svg.querySelector('path');
                const pathComputed = path ? window.getComputedStyle(path) : null;
                const rect = svg.getBoundingClientRect();
                console.log(`[Rust-Injected-Debug] SVG ${idx}:`, {
                    width: computed.width,
                    height: computed.height,
                    display: computed.display,
                    visibility: computed.visibility,
                    opacity: computed.opacity,
                    stroke: computed.stroke,
                    color: computed.color,
                    pathStroke: pathComputed ? pathComputed.stroke : 'N/A',
                    pathStrokeWidth: pathComputed ? pathComputed.strokeWidth : 'N/A',
                    rect: { width: rect.width, height: rect.height }
                });
            });
            
            const buttons = document.querySelectorAll('.titlebar-button');
            console.log('[Rust-Injected-Debug] Button count:', buttons.length);
            buttons.forEach((btn, idx) => {
                const computed = window.getComputedStyle(btn);
                const before = window.getComputedStyle(btn, '::before');
                console.log(`[Rust-Injected-Debug] Button ${idx}:`, {
                    color: computed.color,
                    beforeContent: before.content,
                    beforeDisplay: before.display,
                    beforeMaskImage: before.maskImage || before.webkitMaskImage,
                    beforeBackground: before.backgroundColor,
                    beforeWidth: before.width,
                    beforeHeight: before.height
                });
            });
        }, 2000);
    "#;

    match win.eval(debug_script) {
        Ok(_) => cc_debug!("[CursorChanger] Debug script injected successfully"),
        Err(e) => cc_error!("[CursorChanger] Debug script injection failed: {}", e),
    }
}

/// Calculate and apply optimal window size based on monitor dimensions.
///
/// Computes a 16:9 window size scaled to a percentage of the monitor width
/// (default 80%, override with `HCT_INITIAL_WINDOW_SCALE` env var).
/// Centers the window on the primary monitor.
pub(crate) fn apply_optimal_window_size(app: &AppHandle, win: &WebviewWindow) {
    const DEFAULT_INITIAL_WINDOW_SCALE: f64 = 0.8;
    let initial_scale = std::env::var("HCT_INITIAL_WINDOW_SCALE")
        .ok()
        .and_then(|v| v.parse::<f64>().ok())
        .filter(|v| *v > 0.0 && *v <= 1.0)
        .unwrap_or(DEFAULT_INITIAL_WINDOW_SCALE);

    let (monitor_w, monitor_h, monitor_x, monitor_y) = match app.primary_monitor() {
        Ok(Some(m)) => {
            let scale = m.scale_factor();
            let s = m.size();
            let p = m.position();
            (
                (s.width as f64) / scale,
                (s.height as f64) / scale,
                (p.x as f64) / scale,
                (p.y as f64) / scale,
            )
        }
        _ => match win.current_monitor() {
            Ok(Some(m)) => {
                let scale = m.scale_factor();
                let s = m.size();
                let p = m.position();
                (
                    (s.width as f64) / scale,
                    (s.height as f64) / scale,
                    (p.x as f64) / scale,
                    (p.y as f64) / scale,
                )
            }
            _ => (1440.0, 810.0, 0.0, 0.0),
        },
    };

    let mut target_w = (monitor_w * initial_scale).round();
    let mut target_h = (target_w * 9.0 / 16.0).round();
    let max_h = (monitor_h * 0.95).floor();
    if target_h > max_h {
        target_h = max_h;
        target_w = (target_h * 16.0 / 9.0).round();
    }

    if let Err(e) = win.set_size(tauri::Size::Logical(tauri::LogicalSize {
        width: target_w,
        height: target_h,
    })) {
        cc_error!("[CursorChanger] Failed to set initial window size: {}", e);
    } else {
        cc_debug!(
            "[CursorChanger] Set initial window size to {}x{} (monitor {}x{}, scale={})",
            target_w,
            target_h,
            monitor_w,
            monitor_h,
            initial_scale
        );

        let target_x = (monitor_x + (monitor_w - target_w) / 2.0).round();
        let target_y = (monitor_y + (monitor_h - target_h) / 2.0).round();

        if let Err(e) = win.set_position(tauri::Position::Logical(tauri::LogicalPosition {
            x: target_x,
            y: target_y,
        })) {
            cc_error!(
                "[CursorChanger] Failed to center initial window position: {}",
                e
            );
        } else {
            cc_debug!(
                "[CursorChanger] Centered window at {}x{} on monitor origin {}x{}",
                target_x,
                target_y,
                monitor_x,
                monitor_y
            );
        }
    }
}
