use crate::commands::command_helpers;
use crate::state::{AppState, CursorInfo, CursorStatePayload};
use crate::system;
use cursor_changer::CURSOR_TYPES;
use std::collections::HashMap;
use tauri::{AppHandle, State};

use super::set_cursor_focus::refocus_main_window_later;
use super::set_cursor_validation::{validate_cursor_file, validate_cursor_size};

pub(crate) fn apply_cursor_paths_for_mode(
    mode: &str,
    cursor_paths: &HashMap<String, String>,
    cursor_size: i32,
) {
    if mode == "simple" {
        crate::cursor_defaults::apply_cursor_paths_simple(cursor_paths, cursor_size);
    } else {
        crate::cursor_defaults::apply_cursor_paths_advanced(cursor_paths, cursor_size);
    }
}

pub(super) fn set_all_cursors(
    image_path: String,
    state: State<AppState>,
    app: AppHandle,
) -> Result<Vec<CursorInfo>, String> {
    let cursor_types = &CURSOR_TYPES;
    let mut result = Vec::new();

    let final_path = validate_cursor_file(&image_path, &app)?;

    let mut new_cursor_paths = std::collections::HashMap::new();
    for cursor_type in cursor_types {
        if !final_path.is_empty() {
            new_cursor_paths.insert(cursor_type.name.to_string(), final_path.clone());
        }

        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path: if final_path.is_empty() {
                None
            } else {
                Some(final_path.clone())
            },
        });
    }

    let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
        guard.cursor.cursor_paths = new_cursor_paths;
        Ok(())
    })?;

    Ok(result)
}

pub(super) fn set_all_cursors_with_size(
    image_path: String,
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<Vec<CursorInfo>, String> {
    let cursor_types = &CURSOR_TYPES;
    let mut result = Vec::new();

    if image_path.is_empty() {
        return Err("Image path cannot be empty".into());
    }

    let final_path = validate_cursor_file(&image_path, &app)?;

    validate_cursor_size(size)?;

    if !system::apply_cursor_file_with_size(&final_path, size) {
        return Err("Failed to apply cursor file with specified size".into());
    }

    let mut new_cursor_paths = std::collections::HashMap::new();
    for cursor_type in cursor_types {
        new_cursor_paths.insert(cursor_type.name.to_string(), final_path.clone());

        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path: Some(final_path.clone()),
        });
    }

    let final_path_for_state = final_path.clone();
    let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
        guard.prefs.cursor_size = size;
        guard.cursor.last_loaded_cursor_path = Some(final_path_for_state);
        for (cursor_name, cursor_path) in new_cursor_paths {
            guard.cursor.cursor_paths.insert(cursor_name, cursor_path);
        }
        Ok(())
    })?;

    refocus_main_window_later(app);

    Ok(result)
}

pub(super) fn set_single_cursor_with_size(
    cursor_name: String,
    image_path: String,
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<CursorInfo, String> {
    let cursor_type = CURSOR_TYPES
        .iter()
        .find(|ct| ct.name == cursor_name)
        .ok_or_else(|| format!("Cursor type '{}' not found", cursor_name))?;

    if image_path.is_empty() {
        return Err("Image path cannot be empty".into());
    }

    let final_path = validate_cursor_file(&image_path, &app)?;

    validate_cursor_size(size)?;

    if !system::apply_cursor_from_file_with_size(&final_path, cursor_type.id, size) {
        return Err("Failed to apply cursor file with specified size".into());
    }

    let id = cursor_type.id;
    let name = cursor_type.name.to_string();
    let display_name = cursor_type.display_name.to_string();

    let final_path_for_state = final_path.clone();
    let (_, info) =
        command_helpers::update_state_and_emit_with_result(&app, &state, false, move |guard| {
            guard.prefs.cursor_size = size;
            guard.cursor.last_loaded_cursor_path = Some(final_path_for_state.clone());
            guard
                .cursor
                .cursor_paths
                .insert(name.clone(), final_path_for_state);

            Ok(CursorInfo {
                id,
                name: name.clone(),
                display_name,
                image_path: Some(image_path),
            })
        })?;

    Ok(info)
}

pub(super) fn set_multiple_cursors_with_size(
    cursor_names: Vec<String>,
    image_path: String,
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<Vec<CursorInfo>, String> {
    let mut result = Vec::new();

    if image_path.is_empty() {
        return Err("Image path cannot be empty".into());
    }

    let final_path = validate_cursor_file(&image_path, &app)?;

    validate_cursor_size(size)?;

    let mut new_cursor_paths = std::collections::HashMap::new();

    for cursor_name in &cursor_names {
        let cursor_type = CURSOR_TYPES
            .iter()
            .find(|ct| &ct.name == cursor_name)
            .ok_or_else(|| format!("Cursor type '{}' not found", cursor_name))?;

        if !system::apply_cursor_from_file_with_size(&final_path, cursor_type.id, size) {
            return Err(format!(
                "Failed to apply cursor file to {} with specified size",
                cursor_name
            ));
        }

        new_cursor_paths.insert(cursor_type.name.to_string(), final_path.clone());

        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path: Some(final_path.clone()),
        });
    }

    let final_path_for_state = final_path.clone();
    let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
        guard.prefs.cursor_size = size;
        guard.cursor.last_loaded_cursor_path = Some(final_path_for_state);
        for (cursor_name, cursor_path) in new_cursor_paths {
            guard.cursor.cursor_paths.insert(cursor_name, cursor_path);
        }
        Ok(())
    })?;

    Ok(result)
}

pub(super) fn set_cursor_size(
    size: i32,
    state: State<AppState>,
    app: AppHandle,
) -> Result<CursorStatePayload, String> {
    validate_cursor_size(size)?;

    let (cursor_path, cursor_paths) = {
        let cursor = state
            .cursor
            .read()
            .map_err(|e| format!("Failed to lock state: {}", e))?;
        (
            cursor.last_loaded_cursor_path.clone(),
            cursor.cursor_paths.clone(),
        )
    };

    if !cursor_paths.is_empty() {
        let cursor_types = &CURSOR_TYPES;

        for cursor_type in cursor_types {
            if let Some(cur_path) = cursor_paths.get(cursor_type.name) {
                if !system::apply_cursor_from_file_with_size(cur_path, cursor_type.id, size) {
                    cc_warn!(
                        "Warning: Failed to resize cursor {} to {}px",
                        cursor_type.name,
                        size
                    );
                }
            }
        }

        let new_cursor_paths = cursor_paths.clone();
        let cursor_path_for_state = cursor_path.clone();
        let payload = command_helpers::update_state_and_emit(&app, &state, true, |guard| {
            guard.prefs.cursor_size = size;
            guard.cursor.last_loaded_cursor_path = cursor_path_for_state;
            guard.cursor.cursor_paths = new_cursor_paths;
            Ok(())
        })?;

        refocus_main_window_later(app);

        Ok(payload)
    } else if let Some(path) = cursor_path {
        if !system::apply_cursor_file_with_size(&path, size) {
            return Err("Failed to apply cursor at new size".into());
        }

        let new_cursor_paths = std::collections::HashMap::new();
        let path_for_state = path.clone();
        let payload = command_helpers::update_state_and_emit(&app, &state, true, |guard| {
            guard.prefs.cursor_size = size;
            guard.cursor.last_loaded_cursor_path = Some(path_for_state);
            guard.cursor.cursor_paths = new_cursor_paths;
            Ok(())
        })?;

        refocus_main_window_later(app);

        Ok(payload)
    } else {
        let new_cursor_paths = std::collections::HashMap::new();
        let payload = command_helpers::update_state_and_emit(&app, &state, true, |guard| {
            guard.prefs.cursor_size = size;
            guard.cursor.last_loaded_cursor_path = None;
            guard.cursor.cursor_paths = new_cursor_paths;
            Ok(())
        })?;

        Ok(payload)
    }
}
