use notify::RecommendedWatcher;
/// File system watcher for the library cursors folder.
/// Watches for added/removed .cur/.ani files and emits events to the frontend.
use std::sync::mpsc;
use std::sync::Mutex;
use tauri::{AppHandle, State};

/// Global state to track and control the watcher
pub struct FolderWatcherState {
    watcher: Option<RecommendedWatcher>,
    stop_tx: Option<mpsc::Sender<()>>,
    join_handle: Option<std::thread::JoinHandle<()>>,
    running: bool,
}

impl Default for FolderWatcherState {
    fn default() -> Self {
        Self {
            watcher: None,
            stop_tx: None,
            join_handle: None,
            running: false,
        }
    }
}

/// Check if a file is a cursor file (.cur or .ani)
fn is_cursor_file(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let ext_lower = ext.to_lowercase();
            ext_lower == "cur" || ext_lower == "ani"
        })
        .unwrap_or(false)
}

/// Start watching the library cursors folder for changes
#[tauri::command]
pub fn start_library_folder_watcher(
    app: AppHandle,
    state: State<'_, Mutex<FolderWatcherState>>,
) -> Result<(), String> {
    let cursors_folder = crate::paths::cursors_dir()?;

    watcher::start_watcher(app, &state, cursors_folder)
}

/// Stop watching the library cursors folder
#[tauri::command]
pub fn stop_library_folder_watcher(
    state: State<'_, Mutex<FolderWatcherState>>,
) -> Result<(), String> {
    stop_watcher_for_shutdown(&state)
}

pub(crate) fn stop_watcher_for_shutdown(state: &Mutex<FolderWatcherState>) -> Result<(), String> {
    watcher::stop_watcher(state)
}

/// Sync the library with files currently in the cursors folder.
/// This scans the folder for .cur/.ani files and ensures the library JSON reflects them.
#[tauri::command]
pub fn sync_library_with_folder(app: AppHandle) -> Result<(), String> {
    sync::sync_library_with_folder_inner(&app)
}

#[path = "folder_watcher/watcher.rs"]
mod watcher;

#[path = "folder_watcher/sync.rs"]
mod sync;

/// Read the hotspot from a .cur file
fn read_cursor_hotspot(file_path: &str) -> Option<(u16, u16)> {
    let bytes = std::fs::read(file_path).ok()?;

    // CUR file format: hotspot is at bytes 10-11 (X) and 12-13 (Y) in the ICONDIRENTRY
    if bytes.len() >= 22 {
        let hotspot_x = u16::from_le_bytes([bytes[10], bytes[11]]);
        let hotspot_y = u16::from_le_bytes([bytes[12], bytes[13]]);
        Some((hotspot_x, hotspot_y))
    } else {
        None
    }
}
