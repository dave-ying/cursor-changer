use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::commands::cursor_commands::show_cursor;
use crate::commands::folder_watcher::{stop_watcher_for_shutdown, FolderWatcherState};
use crate::state::AppState;
use crate::system;

static EXIT_REQUESTED: AtomicBool = AtomicBool::new(false);

pub fn quit_app(app: AppHandle) {
    request_exit(app);
}

#[allow(dead_code)]
/// Graceful app quit with proper cleanup
pub fn quit_app_graceful(app: AppHandle) {
    cc_debug!("[CursorChanger] Starting graceful shutdown");

    if let Some(watcher_state) = app.try_state::<Mutex<FolderWatcherState>>() {
        let _ = stop_watcher_for_shutdown(&*watcher_state);
    }

    restore_on_exit(&app);

    cc_debug!("[CursorChanger] Requesting app exit");
    app.exit(0);
}

pub fn request_exit(app: AppHandle) {
    if EXIT_REQUESTED.swap(true, Ordering::SeqCst) {
        return;
    }

    cc_debug!("[CursorChanger] Starting shutdown");

    if let Some(watcher_state) = app.try_state::<Mutex<FolderWatcherState>>() {
        let _ = stop_watcher_for_shutdown(&*watcher_state);
    }

    restore_on_exit(&app);

    cc_debug!("[CursorChanger] Requesting app exit");
    app.exit(0);
}

#[allow(dead_code)]
pub fn restore_state(state: &AppState) -> bool {
    let was_hidden = state.cursor.read().map(|c| c.hidden).unwrap_or(false);
    if was_hidden {
        if let Err(err) = show_cursor(state) {
            cc_error!("{err}");
        }
    }

    let cursor_registry_snapshot = state
        .restoration
        .read()
        .ok()
        .and_then(|r| r.cursor_registry_snapshot.clone());

    // Restore registry entries outside the lock.
    cc_debug!("[CursorChanger] Restoring cursor registry entries");
    let restored_registry = if let Some(snapshot) = &cursor_registry_snapshot {
        cursor_changer::restore_cursor_registry_entries(snapshot)
    } else {
        cursor_changer::clear_cursor_registry_entries()
    };
    if !restored_registry {
        cc_warn!("[CursorChanger] Warning: Failed to restore cursor registry entries");
    }

    // Tell Windows to reload cursors from registry (which now has empty values = defaults)
    let restored = system::restore_system_cursors();
    if !restored {
        cc_warn!("[CursorChanger] Warning: Failed to restore system cursors on exit");
    }

    if let Ok(mut cursor) = state.cursor.write() {
        cursor.cursor_paths.clear();
        cursor.last_loaded_cursor_path = None;
    }

    restored && restored_registry
}

pub fn restore_on_exit(app: &AppHandle) {
    if let Some(state) = app.try_state::<AppState>() {
        let cursor_registry_snapshot = state
            .restoration
            .read()
            .ok()
            .and_then(|guard| guard.cursor_registry_snapshot.clone());

        // Restore registry entries outside the lock.
        cc_debug!("[CursorChanger] Restoring cursor registry entries");
        let restored_registry = if let Some(snapshot) = &cursor_registry_snapshot {
            cursor_changer::restore_cursor_registry_entries(snapshot)
        } else {
            cursor_changer::clear_cursor_registry_entries()
        };
        if !restored_registry {
            cc_warn!("[CursorChanger] Warning: Failed to restore cursor registry entries");
        }

        // Tell Windows to reload cursors from registry (which now has empty values = defaults)
        let restored = system::restore_system_cursors();
        if !restored {
            cc_warn!("[CursorChanger] Warning: Failed to restore system cursors on exit");
        }

        // Clear in-memory state after system calls complete.
        if let Ok(mut cursor) = state.cursor.write() {
            cursor.hidden = false;
            cursor.cursor_paths.clear();
            cursor.last_loaded_cursor_path = None;
        }
    }

    let _ = app.global_shortcut().unregister_all();
}
