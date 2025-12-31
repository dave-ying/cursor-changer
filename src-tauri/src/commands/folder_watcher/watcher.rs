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
    folders: Vec<(PathBuf, RecursiveMode)>,
) -> Result<(), String> {
    let mut guard = state.lock().map_err(|e| format!("Lock error: {}", e))?;
    if guard.running {
        return Ok(());
    }

    cc_debug!("[FolderWatcher] Starting watcher for folders: {:?}", folders);

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

    for (folder, mode) in &folders {
        if folder.exists() {
            watcher
                .watch(folder, *mode)
                .map_err(|e| format!("Failed to watch folder {:?}: {}", folder, e))?;
        } else {
            // Just warn, don't fail if one folder is missing (e.g. nested packs might not exist yet)
            cc_warn!(
                "[FolderWatcher] Skipping watch on non-existent folder: {:?}",
                folder
            );
        }
    }

    let join_handle = std::thread::spawn(move || loop {
        if stop_rx.try_recv().is_ok() {
            break;
        }

        match event_rx.recv_timeout(Duration::from_millis(200)) {
            Ok(event) => {
                for path in event.paths.iter() {
                    let path_str = path.to_string_lossy().to_string();
                    let is_dir = path.is_dir();
                    
                    // For directories, we need to handle them specially in cursor-packs
                    if is_dir {
                        if let Ok(cursor_packs_root) = crate::paths::cursor_packs_dir() {
                            if path.starts_with(&cursor_packs_root) {
                                // This is a directory under cursor-packs
                                match &event.kind {
                                    EventKind::Create(_) => {
                                        cc_debug!("[FolderWatcher] Pack folder created: {}", path_str);
                                        // Trigger sync to detect new packs in this folder
                                        let _ = app_handle.emit(
                                            events::LIBRARY_FILE_ADDED,
                                            serde_json::json!({
                                                "path": path_str,
                                                "name": path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown")
                                            }),
                                        );
                                    }
                                    EventKind::Remove(_) => {
                                        cc_debug!("[FolderWatcher] Pack folder removed: {}", path_str);
                                        // Trigger sync to remove packs that were in this folder
                                        let _ = app_handle.emit(
                                            events::LIBRARY_FILE_REMOVED,
                                            serde_json::json!({
                                                "path": path_str,
                                                "name": path.file_name().and_then(|n| n.to_str()).unwrap_or("unknown")
                                            }),
                                        );
                                    }
                                    _ => {}
                                }
                            }
                        }
                        // Skip further processing for directories that aren't cursor files
                        if !is_cursor_file(path.as_path()) {
                            continue;
                        }
                    }
                    
                    if !is_cursor_file(path.as_path()) {
                        continue;
                    }

                    let file_name = path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("unknown")
                        .to_string();

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
