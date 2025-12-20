/// Core cursor setting commands - individual cursor operations
use crate::commands::command_helpers;
use crate::commands::customization::set_cursor_validation::validate_cursor_file;
use crate::state::{AppState, CursorInfo};
use cursor_changer::CURSOR_TYPES;
use tauri::{AppHandle, State};

/// Set a single cursor image
#[tauri::command]
pub fn set_cursor_image(
    cursor_name: String,
    image_path: String,
    state: State<AppState>,
    app: AppHandle,
) -> Result<CursorInfo, String> {
    // Find the cursor type
    let cursor_type = CURSOR_TYPES
        .iter()
        .find(|ct| ct.name == cursor_name)
        .ok_or_else(|| format!("Cursor type '{}' not found", cursor_name))?;

    // Validate and process the file
    let final_path = validate_cursor_file(&image_path, &app)?;

    let id = cursor_type.id;
    let name = cursor_type.name.to_string();
    let display_name = cursor_type.display_name.to_string();

    let (_, info) =
        command_helpers::update_state_and_emit_with_result(&app, &state, false, move |guard| {
            if final_path.is_empty() {
                guard.cursor.cursor_paths.remove(&name);
            } else {
                guard
                    .cursor
                    .cursor_paths
                    .insert(name.clone(), final_path.clone());
            }

            Ok(CursorInfo {
                id,
                name: name.clone(),
                display_name,
                image_path: if final_path.is_empty() {
                    None
                } else {
                    Some(final_path)
                },
            })
        })?;

    Ok(info)
}
