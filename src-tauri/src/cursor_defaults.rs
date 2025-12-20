use std::{collections::HashMap, path::PathBuf};

use tauri::{AppHandle, Manager};

use crate::system;

pub const SIMPLE_MODE_CURSOR_NAMES: [&str; 14] = [
    "Normal",
    "IBeam",
    "Wait",
    "Cross",
    "Up",
    "SizeNWSE",
    "SizeNESW",
    "SizeWE",
    "SizeNS",
    "SizeAll",
    "No",
    "AppStarting",
    "Help",
    "Pen",
];

fn default_cursors_dir_candidates(app: &AppHandle, cursor_style: &str) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("default-cursors").join(cursor_style));
    }

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(
            cwd.join("src-tauri")
                .join("default-cursors")
                .join(cursor_style),
        );
    }

    if let Ok(app_data_dir) = std::env::var("APPDATA") {
        candidates.push(
            PathBuf::from(app_data_dir)
                .join("cursor-changer")
                .join("default-cursors")
                .join(cursor_style),
        );
    }

    candidates
}

pub fn resolve_default_cursors_dir(app: &AppHandle, cursor_style: &str) -> Result<PathBuf, String> {
    let candidates = default_cursors_dir_candidates(app, cursor_style);

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.clone());
        }
    }

    if let Some(first) = candidates.first() {
        return Ok(first.clone());
    }

    Err("Failed to resolve default cursors directory".to_string())
}

pub fn resolve_default_cursor_paths(
    app: &AppHandle,
    cursor_style: &str,
) -> Result<HashMap<String, PathBuf>, String> {
    let cur_dir = resolve_default_cursors_dir(app, cursor_style)?;
    cc_debug!(
        "[CursorChanger] Using default-cursors path: {} (style: {})",
        cur_dir.display(),
        cursor_style
    );

    let base_name_mapping = &cursor_changer::DEFAULT_CURSOR_BASE_NAMES;
    let mut cursor_paths = HashMap::new();
    for &(cursor_name, base_name) in base_name_mapping.iter() {
        if let Some(cur_path) = cursor_changer::find_cursor_file_in_dir(&cur_dir, base_name) {
            cursor_paths.insert(cursor_name.to_string(), cur_path);
        } else {
            cc_warn!(
                "Warning: Cursor file not found for {} (base name: {}) in {}",
                cursor_name,
                base_name,
                cur_dir.display()
            );
        }
    }
    Ok(cursor_paths)
}

pub fn resolve_default_cursor_path(
    app: &AppHandle,
    cursor_style: &str,
    cursor_name: &str,
) -> Result<Option<PathBuf>, String> {
    let candidates = default_cursors_dir_candidates(app, cursor_style);

    for cur_dir in candidates {
        if let Some(found) = cursor_changer::find_default_cursor_in_dir(&cur_dir, cursor_name) {
            cc_debug!(
                "[CursorChanger] Using default-cursors path: {} (style: {})",
                cur_dir.display(),
                cursor_style
            );
            return Ok(Some(found));
        }
    }

    Ok(None)
}

pub fn populate_missing_cursor_paths_with_defaults(
    app: &AppHandle,
    cursor_style: &str,
    cursor_paths: &mut HashMap<String, String>,
) -> Result<(), String> {
    let cur_dir = resolve_default_cursors_dir(app, cursor_style)?;

    let base_name_mapping = &cursor_changer::DEFAULT_CURSOR_BASE_NAMES;
    for &(cursor_name, base_name) in base_name_mapping.iter() {
        if cursor_paths.contains_key(cursor_name) {
            continue;
        }

        if let Some(cur_path) = cursor_changer::find_cursor_file_in_dir(&cur_dir, base_name) {
            cursor_paths.insert(
                cursor_name.to_string(),
                cur_path.to_string_lossy().to_string(),
            );
        }
    }

    Ok(())
}

pub fn apply_cursor_paths_advanced(cursor_paths: &HashMap<String, String>, cursor_size: i32) {
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    for cursor_type in cursor_types {
        if let Some(cursor_path) = cursor_paths.get(cursor_type.name) {
            if !system::apply_cursor_from_file_with_size(cursor_path, cursor_type.id, cursor_size) {
                cc_warn!("Warning: Failed to apply cursor for {}", cursor_type.name);
            }
        }
    }
}

pub fn apply_cursor_paths_simple(cursor_paths: &HashMap<String, String>, cursor_size: i32) {
    if let Some(normal_path) = cursor_paths.get("Normal") {
        for cursor_name in SIMPLE_MODE_CURSOR_NAMES {
            if let Some(cursor_type) = cursor_changer::CURSOR_TYPES
                .iter()
                .find(|ct| ct.name == cursor_name)
            {
                if !system::apply_cursor_from_file_with_size(
                    normal_path,
                    cursor_type.id,
                    cursor_size,
                ) {
                    cc_warn!("Warning: Failed to apply Normal cursor to {}", cursor_name);
                }
            }
        }
    }

    if let Some(hand_path) = cursor_paths.get("Hand") {
        if let Some(hand_type) = cursor_changer::CURSOR_TYPES
            .iter()
            .find(|ct| ct.name == "Hand")
        {
            if !system::apply_cursor_from_file_with_size(hand_path, hand_type.id, cursor_size) {
                cc_warn!("Warning: Failed to apply Hand cursor");
            }
        }
    }
}
