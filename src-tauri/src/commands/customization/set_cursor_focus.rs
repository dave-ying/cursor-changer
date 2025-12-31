/// Focus management for cursor operations
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime};

/// Try to restore main window focus shortly after applying system-wide cursor changes.
/// Some Windows messages triggered by cursor updates can cause the WebView to lose focus;
/// a short delayed focus attempt helps recover the app window without blocking the caller.
pub fn refocus_main_window_later<R: Runtime>(app: AppHandle<R>) {
    let a = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(150));
        if let Some(win) = a.get_webview_window("main") {
            let _ = win.set_focus();
        }
    });
}
