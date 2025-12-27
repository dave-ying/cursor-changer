use crate::state::AppState;
/// State management utilities for cursor operations
use tauri::State;

#[allow(dead_code)]
/// Update cursor state in memory
pub fn update_cursor_state(state: &State<AppState>, cursor_name: &str, final_path: &str) {
    if let Ok(mut cursor) = state.cursor.write() {
        if final_path.is_empty() {
            cursor.cursor_paths.remove(cursor_name);
        } else {
            cursor
                .cursor_paths
                .insert(cursor_name.to_string(), final_path.to_string());
        }
    }
}

#[allow(dead_code)]
/// Update cursor size and merge cursor paths (preserving existing mappings)
pub fn update_cursor_size_with_merge(
    state: &State<AppState>,
    size: i32,
    last_path: Option<String>,
    new_cursor_paths: std::collections::HashMap<String, String>,
) {
    if let Ok(mut prefs) = state.prefs.write() {
        prefs.cursor_size = size;
    }

    if let Ok(mut cursor) = state.cursor.write() {
        if let Some(path) = last_path {
            cursor.last_loaded_cursor_path = Some(path);
        }
        // Merge new cursor paths with existing ones
        for (cursor_name, cursor_path) in new_cursor_paths {
            cursor.cursor_paths.insert(cursor_name, cursor_path);
        }
    }
}

#[allow(dead_code)]
/// Update cursor size and replace cursor paths (legacy function)
pub fn update_cursor_size(
    state: &State<AppState>,
    size: i32,
    last_path: Option<String>,
    cursor_paths: std::collections::HashMap<String, String>,
) {
    if let Ok(mut prefs) = state.prefs.write() {
        prefs.cursor_size = size;
    }

    if let Ok(mut cursor) = state.cursor.write() {
        if let Some(path) = last_path {
            cursor.last_loaded_cursor_path = Some(path);
        }
        cursor.cursor_paths = cursor_paths;
    }
}
