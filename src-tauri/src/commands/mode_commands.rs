use crate::commands::command_helpers;
use crate::commands::customization::cursor_apply_service;
use crate::state::{AppState, CustomizationMode};
/// Mode switching commands - handle transitions between Simple and Advanced modes
use tauri::{AppHandle, State};

/// Switch customization mode and apply appropriate cursors
/// When switching modes, only Normal and Hand cursors are copied between modes
#[tauri::command]
pub fn switch_customization_mode(
    mode: CustomizationMode,
    app: AppHandle,
    state: State<AppState>,
) -> Result<String, String> {
    let (
        old_mode,
        old_cursor_paths,
        simple_mode_cursor_paths,
        advanced_mode_cursor_paths,
        cursor_size,
        cursor_style,
    ) = {
        let guard = state
            .read_all()
            .map_err(|e| format!("Failed to lock state: {}", e))?;

        (
            guard.modes.customization_mode,
            guard.cursor.cursor_paths.clone(),
            guard.modes.simple_mode_cursor_paths.clone(),
            guard.modes.advanced_mode_cursor_paths.clone(),
            guard.prefs.cursor_size,
            guard.prefs.default_cursor_style,
        )
    };

    if old_mode == mode {
        return Ok(format!("Already in {} mode", mode.as_str()));
    }

    // Save current cursor_paths to the old mode's storage
    let mut new_simple_mode_cursor_paths = simple_mode_cursor_paths;
    let mut new_advanced_mode_cursor_paths = advanced_mode_cursor_paths;
    if old_mode == CustomizationMode::Simple {
        new_simple_mode_cursor_paths = old_cursor_paths.clone();
    } else {
        new_advanced_mode_cursor_paths = old_cursor_paths.clone();
    }

    // Get Normal and Hand cursors from the old mode to copy to new mode
    let normal_cursor = old_cursor_paths.get("Normal").cloned();
    let hand_cursor = old_cursor_paths.get("Hand").cloned();

    // Load cursor paths from the new mode's storage
    let new_cursor_paths = if mode == CustomizationMode::Simple {
        new_simple_mode_cursor_paths.clone()
    } else {
        new_advanced_mode_cursor_paths.clone()
    };

    // Copy Normal and Hand cursors from old mode to new mode
    let mut merged_cursor_paths = new_cursor_paths;
    if let Some(normal_path) = normal_cursor {
        merged_cursor_paths.insert("Normal".to_string(), normal_path);
    }
    if let Some(hand_path) = hand_cursor {
        merged_cursor_paths.insert("Hand".to_string(), hand_path);
    }

    // If switching to Advanced mode and some cursors are missing, populate them with defaults.
    // Resolve the resource directory and fallback to `src-tauri/default-cursors` in dev if resource_dir() not available
    if mode == CustomizationMode::Advanced {
        crate::cursor_defaults::populate_missing_cursor_paths_with_defaults(
            &app,
            cursor_style.as_str(),
            &mut merged_cursor_paths,
        )?;
    }

    cc_debug!(
        "[CursorChanger] switch_customization_mode: merged paths count: {}",
        merged_cursor_paths.len()
    );

    // Apply cursors based on the new mode
    cursor_apply_service::apply_cursor_paths_for_mode(
        mode.as_str(),
        &merged_cursor_paths,
        cursor_size,
    );

    let merged_cursor_paths_for_state = merged_cursor_paths.clone();
    let new_simple_for_state = new_simple_mode_cursor_paths.clone();
    let new_advanced_for_state = new_advanced_mode_cursor_paths.clone();
    let mode_for_state = mode;
    let _ = command_helpers::update_state_and_emit(&app, &state, true, |guard| {
        guard.modes.customization_mode = mode_for_state;
        guard.cursor.cursor_paths = merged_cursor_paths_for_state.clone();
        guard.modes.simple_mode_cursor_paths = new_simple_for_state;
        guard.modes.advanced_mode_cursor_paths = new_advanced_for_state;

        // Save updated paths back to the new mode's storage
        if guard.modes.customization_mode == CustomizationMode::Simple {
            guard.modes.simple_mode_cursor_paths = merged_cursor_paths_for_state.clone();
        } else {
            guard.modes.advanced_mode_cursor_paths = merged_cursor_paths_for_state.clone();
        }

        Ok(())
    })?;
    Ok(format!("Switched to {} mode", mode.as_str()))
}

/// Get the current customization mode
#[tauri::command]
pub fn get_customization_mode(state: State<AppState>) -> Result<CustomizationMode, String> {
    let modes = state
        .modes
        .read()
        .map_err(|_| "Application state poisoned".to_string())?;
    Ok(modes.customization_mode)
}
