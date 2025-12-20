/// Bulk cursor operations - set all cursors or multiple cursors
use super::cursor_apply_service;
use crate::state::{AppState, CursorInfo};
use tauri::{AppHandle, State};

/// Set all cursors to the same image
#[tauri::command]
pub fn set_all_cursors(
    image_path: String,
    state: State<AppState>,
    app: AppHandle,
) -> Result<Vec<CursorInfo>, String> {
    cursor_apply_service::set_all_cursors(image_path, state, app)
}

/// Apply a cursor file to all cursor types with an explicit size
#[tauri::command]
pub fn set_all_cursors_with_size(
    image_path: String,
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<Vec<CursorInfo>, String> {
    cursor_apply_service::set_all_cursors_with_size(image_path, size, state, app)
}

/// Apply a cursor file to a single cursor type with explicit size
#[tauri::command]
pub fn set_single_cursor_with_size(
    cursor_name: String,
    image_path: String,
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<CursorInfo, String> {
    cursor_apply_service::set_single_cursor_with_size(cursor_name, image_path, size, state, app)
}

/// Apply a cursor file to multiple cursor types with explicit size
#[tauri::command]
pub fn set_multiple_cursors_with_size(
    cursor_names: Vec<String>,
    image_path: String,
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<Vec<CursorInfo>, String> {
    cursor_apply_service::set_multiple_cursors_with_size(cursor_names, image_path, size, state, app)
}
