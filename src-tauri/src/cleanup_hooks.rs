// Windows-specific cleanup hooks to ensure cursor restoration on any exit
#[cfg(debug_assertions)]
#[cfg(not(test))]
use crate::commands::shutdown::restore_on_exit;
#[cfg(debug_assertions)]
use crate::system;
#[cfg(debug_assertions)]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(debug_assertions)]
use std::thread;
#[cfg(debug_assertions)]
use std::time::Duration;
#[cfg(debug_assertions)]
/// Global flag to prevent multiple cleanup attempts
static CLEANUP_EXECUTED: AtomicBool = AtomicBool::new(false);

#[cfg(debug_assertions)]
use std::sync::OnceLock;

#[cfg(debug_assertions)]
/// Global app handle for cleanup access (debug-only; used by emergency cleanup tooling)
static APP_HANDLE: OnceLock<tauri::AppHandle> = OnceLock::new();

#[cfg(debug_assertions)]
/// Initialize cleanup hooks during app startup (debug-only to avoid noisy logs/timeouts in release)
pub fn initialize_cleanup_hooks(app: &tauri::AppHandle) {
    let _ = APP_HANDLE.set(app.clone());

    // Start monitoring thread to handle force-closes (debug diagnostics)
    start_cleanup_monitor_thread();

    // Set up panic hook to ensure cleanup on panic
    std::panic::set_hook(Box::new(|info| {
        cc_error!("[CursorChanger] Application panic detected: {}", info);
        perform_emergency_cleanup("panic");
    }));

    cc_debug!("[CursorChanger] Cleanup hooks initialized (debug only)");
}

#[cfg(debug_assertions)]
/// Perform emergency cleanup - can be called from any thread (debug-only instrumentation)
fn perform_emergency_cleanup(context: impl std::fmt::Display) {
    if CLEANUP_EXECUTED.swap(true, Ordering::SeqCst) {
        return; // Already executed
    }

    cc_error!(
        "[CursorChanger] Emergency cleanup initiated (context: {})",
        context
    );

    let app_handle = APP_HANDLE.get().cloned();

    match app_handle {
        Some(app) => {
            // Use blocking cleanup in a new thread
            let _ = thread::spawn(move || {
                #[cfg(not(test))]
                restore_on_exit(&app);
            });
        }
        None => {
            // Fallback: just try to restore system cursors directly
            let _ = system::restore_system_cursors();
        }
    }
}

#[cfg(debug_assertions)]
/// Start a cleanup monitor thread to handle abnormal terminations (debug-only)
fn start_cleanup_monitor_thread() {
    // This thread will be killed on process exit, but it can help
    // in cases where the main process terminates abnormally
    thread::spawn(|| {
        thread::sleep(Duration::from_millis(1000)); // Wait for app to start

        // Create a simple heartbeat mechanism
        // In a real implementation, this would check process health
        // For now, we just set up a basic timeout cleanup
        thread::spawn(|| {
            thread::sleep(Duration::from_secs(30)); // 30 second timeout
            cc_error!("[CursorChanger] Timeout cleanup triggered");
            perform_emergency_cleanup("timeout");
        });
    });
}
