use crate::state::{AppState, CursorInfo, DefaultCursorStyle};
/// Cursor query commands - get information about cursors
use tauri::State;

use super::cursor_preview_resolver::{CursorPreviewResolver, TauriCursorPreviewDeps};

/// Get list of all cursor types with their current image paths
#[tauri::command]
pub fn get_available_cursors(state: State<AppState>) -> Result<Vec<CursorInfo>, String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;
    let mut result = Vec::new();

    let cursor = state
        .cursor
        .read()
        .map_err(|_| "Failed to lock state".to_string())?;

    for cursor_type in cursor_types {
        // Get cursor path from in-memory state instead of registry
        let image_path = cursor.cursor_paths.get(cursor_type.name).cloned();
        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path,
        });
    }

    Ok(result)
}

/// Get cursor image path from registry (legacy)
#[tauri::command]
pub fn get_cursor_image(cursor_name: String) -> Result<Option<String>, String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    for cursor_type in cursor_types {
        if cursor_type.name == cursor_name {
            return Ok(cursor_changer::read_cursor_image_from_registry(cursor_type));
        }
    }

    Err(format!("Cursor type '{}' not found", cursor_name))
}

/// Get all custom cursors (excluding default cursors)
#[tauri::command]
pub fn get_custom_cursors(state: State<AppState>) -> Result<Vec<CursorInfo>, String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;
    let mut result = Vec::new();

    let cursor = state
        .cursor
        .read()
        .map_err(|_| "Failed to lock state".to_string())?;

    for cursor_type in cursor_types {
        if let Some(image_path) = cursor.cursor_paths.get(cursor_type.name) {
            // Only include custom cursors, not app defaults
            if !image_path.contains("default-cursors") {
                result.push(CursorInfo {
                    id: cursor_type.id,
                    name: cursor_type.name.to_string(),
                    display_name: cursor_type.display_name.to_string(),
                    image_path: Some(image_path.clone()),
                });
            }
        }
    }

    Ok(result)
}

/// Get preview of a system cursor by name
#[tauri::command]
pub fn get_system_cursor_preview(
    cursor_name: String,
    state: State<AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    for cursor_type in cursor_types {
        if cursor_type.name == cursor_name {
            // Try to get from default cursor files using Tauri resource directory
            // Use name-based lookup to support both .cur and .ani files
            // Get the default cursor style from state (windows or mac)
            let cursor_style = if let Ok(prefs) = state.prefs.read() {
                prefs.default_cursor_style
            } else {
                DefaultCursorStyle::default()
            };

            // First check app state for the cursor path (most reliable source)
            // Try to get from registry
            // Last resort: return a data URL with a placeholder SVG
            let deps = TauriCursorPreviewDeps::new(&*state, &app);
            let resolver = CursorPreviewResolver::new(deps);
            return resolver.resolve_preview(&cursor_name, cursor_style.as_str(), cursor_type);
        }
    }

    Err(format!("Cursor type '{}' not found", cursor_name))
}

/// Create a placeholder SVG for cursors without previews
pub(super) fn create_placeholder_svg(cursor_name: &str) -> String {
    let svg_template = r#"<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" fill="{fill_color}" stroke="{stroke_color}" stroke-width="1"/>
    <text x="16" y="18" text-anchor="middle" font-family="Arial" font-size="8" fill="{text_color}">{text_content}</text>
</svg>"#;

    svg_template
        .replace("{fill_color}", "#f0f0f0")
        .replace("{stroke_color}", "#cccccc")
        .replace("{text_color}", "#666666")
        .replace(
            "{text_content}",
            &cursor_name.chars().take(4).collect::<String>(),
        )
}
