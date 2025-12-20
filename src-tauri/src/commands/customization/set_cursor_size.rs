use super::cursor_apply_service;
use crate::state::{AppState, CursorStatePayload};
/// Cursor size management operations
use tauri::{AppHandle, State};

/// Change the size of the currently loaded cursor
#[tauri::command]
pub fn set_cursor_size(
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<CursorStatePayload, String> {
    cursor_apply_service::set_cursor_size(size, state, app)
}
