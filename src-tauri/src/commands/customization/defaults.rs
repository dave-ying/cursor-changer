use super::cursor_apply_service;
use crate::commands::command_helpers;
use crate::state::{AppState, CursorInfo, CustomizationMode, DefaultCursorStyle};
use crate::system;
/// Default cursor management - load app defaults and reset to system defaults
use std::{collections::HashMap, path::PathBuf};
use tauri::{AppHandle, State};

type CursorName = String;

fn get_default_cursor_style_from_state(state: &State<AppState>) -> DefaultCursorStyle {
    if let Ok(prefs) = state.prefs.read() {
        prefs.default_cursor_style
    } else {
        DefaultCursorStyle::default()
    }
}

fn get_cursor_size_from_state(state: &State<AppState>) -> i32 {
    if let Ok(prefs) = state.prefs.read() {
        prefs.cursor_size
    } else {
        32
    }
}

fn resolve_default_cursor_paths(
    app: &AppHandle,
    cursor_style: &str,
) -> Result<HashMap<CursorName, PathBuf>, String> {
    crate::cursor_defaults::resolve_default_cursor_paths(app, cursor_style)
}

fn resolve_default_cursor_path(
    app: &AppHandle,
    cursor_style: &str,
    cursor_name: &str,
) -> Result<Option<PathBuf>, String> {
    crate::cursor_defaults::resolve_default_cursor_path(app, cursor_style, cursor_name)
}

fn to_state_cursor_paths(resolved: &HashMap<CursorName, PathBuf>) -> HashMap<String, String> {
    resolved
        .iter()
        .map(|(name, path)| (name.clone(), path.to_string_lossy().to_string()))
        .collect()
}

fn apply_resolved_cursors_advanced(resolved: &HashMap<CursorName, PathBuf>, cursor_size: i32) {
    let cursor_paths = to_state_cursor_paths(resolved);
    crate::cursor_defaults::apply_cursor_paths_advanced(&cursor_paths, cursor_size);
}

#[allow(dead_code)]
fn apply_resolved_cursors_simple(resolved: &HashMap<CursorName, PathBuf>, cursor_size: i32) {
    let cursor_paths = to_state_cursor_paths(resolved);
    crate::cursor_defaults::apply_cursor_paths_simple(&cursor_paths, cursor_size);
}

/// Load app's default cursors (15 pre-converted .CUR or .ANI files)
#[tauri::command]
pub fn load_app_default_cursors(
    app: AppHandle,
    state: State<AppState>,
) -> Result<Vec<CursorInfo>, String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    let cursor_style = get_default_cursor_style_from_state(&state);
    let resolved = resolve_default_cursor_paths(&app, cursor_style.as_str())?;
    let cursor_paths = to_state_cursor_paths(&resolved);
    let mut result = Vec::new();

    let target_size = get_cursor_size_from_state(&state);

    cc_debug!(
        "[CursorChanger] Found {} default cursor files",
        cursor_paths.len()
    );
    apply_resolved_cursors_advanced(&resolved, target_size);

    for cursor_type in cursor_types {
        if let Some(cur_path) = cursor_paths.get(cursor_type.name) {
            result.push(CursorInfo {
                id: cursor_type.id,
                name: cursor_type.name.to_string(),
                display_name: cursor_type.display_name.to_string(),
                image_path: Some(cur_path.clone()),
            });
        }
    }

    let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
        guard.cursor.cursor_paths = cursor_paths;
        cc_debug!(
            "[CursorChanger] AppState cursor_paths updated with {} entries",
            guard.cursor.cursor_paths.len()
        );
        if guard.prefs.cursor_size < 32 {
            // Guard against any invalid persisted size; normalize to 32px default.
            guard.prefs.cursor_size = 32;
        }
        Ok(())
    })?;

    Ok(result)
}

// Tests for load_app_default_cursors and resource-dir fallback are not run here due to tauri::test::mock_app AppHandle generics mismatch in project tests.
// Ideally we will add integration tests that run inside a real tauri runtime that can exercise resource_dir and fallback
// behavior. For now, the runtime fallback is enforced in code above and validated in manual dev runs.

/// Reset all cursors to Windows system defaults
#[tauri::command]
pub fn set_cursors_to_windows_defaults(
    app: AppHandle,
    state: State<AppState>,
) -> Result<Vec<CursorInfo>, String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    // Restore system cursors
    if !system::restore_system_cursors() {
        return Err("Failed to restore system cursors".into());
    }

    let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
        guard.cursor.last_loaded_cursor_path = None;
        guard.cursor.cursor_paths.clear();

        if guard.prefs.cursor_size < 32 {
            guard.prefs.cursor_size = 32;
        }

        Ok(())
    })?;

    // Build result
    let mut result = Vec::new();
    for cursor_type in cursor_types {
        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path: None,
        });
    }

    Ok(result)
}

/// Reset a specific cursor to its default
#[tauri::command]
pub fn reset_cursor_to_default(
    app: AppHandle,
    state: State<AppState>,
    cursor_name: String,
) -> Result<(), String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    let cursor_type = cursor_types
        .iter()
        .find(|ct| ct.name == cursor_name)
        .ok_or_else(|| format!("Cursor type '{}' not found", cursor_name))?;

    let cursor_style = get_default_cursor_style_from_state(&state);

    if let Some(cur_path) = resolve_default_cursor_path(&app, cursor_style.as_str(), &cursor_name)?
    {
        let size = {
            let prefs = state
                .prefs
                .read()
                .map_err(|_| "Failed to lock state".to_string())?;
            prefs.cursor_size
        };

        let cur_path_str = cur_path.to_string_lossy().to_string();
        if !system::apply_cursor_from_file_with_size(&cur_path_str, cursor_type.id, size) {
            return Err(format!(
                "Failed to apply default cursor for {}",
                cursor_name
            ));
        }

        let cursor_name_for_state = cursor_name.clone();
        let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
            guard
                .cursor
                .cursor_paths
                .insert(cursor_name_for_state, cur_path_str);
            Ok(())
        })?;
        return Ok(());
    }

    // Restore system default
    if !system::restore_system_cursors() {
        return Err("Failed to restore system cursors".into());
    }

    let cursor_name_for_state = cursor_name.clone();
    let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
        guard.cursor.cursor_paths.remove(&cursor_name_for_state);
        Ok(())
    })?;

    Ok(())
}

/// Delete a custom cursor and reset to default
#[tauri::command]
pub fn delete_custom_cursor(
    app: AppHandle,
    state: State<AppState>,
    cursor_name: String,
) -> Result<(), String> {
    reset_cursor_to_default(app, state, cursor_name)
}

/// Reset cursors to app defaults for the current mode only, preserving cursor size
#[tauri::command]
pub fn reset_current_mode_cursors(
    app: AppHandle,
    state: State<AppState>,
) -> Result<Vec<CursorInfo>, String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    let cursor_style = get_default_cursor_style_from_state(&state);
    let resolved = resolve_default_cursor_paths(&app, cursor_style.as_str())?;
    let cursor_paths = to_state_cursor_paths(&resolved);

    // Get current mode and cursor size
    let (current_mode, cursor_size) = {
        let guard = state
            .read_all()
            .map_err(|e| format!("Failed to lock state: {}", e))?;
        (guard.modes.customization_mode, guard.prefs.cursor_size)
    };

    cursor_apply_service::apply_cursor_paths_for_mode(
        current_mode.as_str(),
        &cursor_paths,
        cursor_size,
    );

    let cursor_paths_for_state = cursor_paths.clone();
    let current_mode_for_state = current_mode;
    let (_, result) =
        command_helpers::update_state_and_emit_with_result(&app, &state, false, |guard| {
            guard.cursor.cursor_paths = cursor_paths_for_state.clone();

            // Update the appropriate mode's storage
            if current_mode_for_state == CustomizationMode::Simple {
                guard.modes.simple_mode_cursor_paths = cursor_paths_for_state.clone();
            } else {
                guard.modes.advanced_mode_cursor_paths = cursor_paths_for_state.clone();
            }

            // Build result
            let mut result = Vec::new();
            for cursor_type in cursor_types {
                if let Some(cur_path) = cursor_paths_for_state.get(cursor_type.name) {
                    result.push(CursorInfo {
                        id: cursor_type.id,
                        name: cursor_type.name.to_string(),
                        display_name: cursor_type.display_name.to_string(),
                        image_path: Some(cur_path.clone()),
                    });
                }
            }

            Ok(result)
        })?;

    Ok(result)
}
