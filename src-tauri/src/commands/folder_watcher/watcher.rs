use super::{is_cursor_file, FolderWatcherState};
use crate::events;
use notify::{EventKind, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::{mpsc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

pub(super) fn start_watcher(
    app: AppHandle,
    state: &Mutex<FolderWatcherState>,
    cursors_folder: PathBuf,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    if guard.running {
        return Ok(());
    }

    cc_debug!(
        "[FolderWatcher] Starting watcher for: {}",
        cursors_folder.display()
    );

    let app_handle = app.clone();
    let (event_tx, event_rx) = mpsc::channel();
    let (stop_tx, stop_rx) = mpsc::channel::<()>();

    let mut watcher =
        notify::recommended_watcher(move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                let _ = event_tx.send(event);
            }
        })
        .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(&cursors_folder, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch folder: {}", e))?;

    let join_handle = std::thread::spawn(move || loop {
        if stop_rx.try_recv().is_ok() {
            break;
        }

        match event_rx.recv_timeout(Duration::from_millis(200)) {
            Ok(event) => {
                for path in event.paths.iter() {
                    if !is_cursor_file(path.as_path()) {
                        continue;
                    }

                    let file_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();

                    let path_str = path.to_string_lossy().to_string();

                    match &event.kind {
                        EventKind::Create(_) => {
                            cc_debug!("[FolderWatcher] File added: {}", file_name);
                            let _ = app_handle.emit(
                                events::LIBRARY_FILE_ADDED,
                                serde_json::json!({
                                    "path": path_str,
                                    "name": file_name
                                }),
                            );
                        }
                        EventKind::Remove(_) => {
                            cc_debug!("[FolderWatcher] File removed: {}", file_name);
                            let _ = app_handle.emit(
                                events::LIBRARY_FILE_REMOVED,
                                serde_json::json!({
                                    "path": path_str,
                                    "name": file_name
                                }),
                            );
                        }
                        // Handle file renames - notify crate reports rename as Modify with RenameMode
                        // When a file is renamed, we get events for both old and new paths
                        // Triggering both events ensures the sync process updates the library correctly
                        EventKind::Modify(notify::event::ModifyKind::Name(_)) => {
                            cc_debug!("[FolderWatcher] File renamed: {}", file_name);
                            // Check if the file exists at this path
                            if path.exists() {
                                // New file path after rename - emit file added
                                let _ = app_handle.emit(
                                    events::LIBRARY_FILE_ADDED,
                                    serde_json::json!({
                                        "path": path_str,
                                        "name": file_name
                                    }),
                                );
                            } else {
                                // Old file path before rename - emit file removed
                                let _ = app_handle.emit(
                                    events::LIBRARY_FILE_REMOVED,
                                    serde_json::json!({
                                        "path": path_str,
                                        "name": file_name
                                    }),
                                );
                            }
                        }
                        _ => {}
                    }
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                cc_debug!("[FolderWatcher] Channel disconnected, stopping watch loop");
                break;
            }
        }
    });

    guard.watcher = Some(watcher);
    guard.stop_tx = Some(stop_tx);
    guard.join_handle = Some(join_handle);
    guard.running = true;

    drop(guard);

    cc_debug!("[FolderWatcher] Watcher started successfully");
    Ok(())
}

pub(super) fn stop_watcher(state: &Mutex<FolderWatcherState>) -> Result<(), String> {
    let (stop_tx, join_handle) = {
        let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;

        if !guard.running {
            return Ok(());
        }

        guard.watcher = None;
        guard.running = false;

        let stop_tx = guard.stop_tx.take();
        let join_handle = guard.join_handle.take();

        (stop_tx, join_handle)
    };

    if let Some(stop_tx) = stop_tx {
        let _ = stop_tx.send(());
    }

    if let Some(join_handle) = join_handle {
        let _ = join_handle.join();
    }

    cc_debug!("[FolderWatcher] Watcher stopped");
    Ok(())
}
