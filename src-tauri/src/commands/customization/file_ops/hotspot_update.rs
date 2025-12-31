use crate::commands::customization::library::{
    load_library, update_cursor_in_library, LibraryCursor,
};
use std::fs;
/// Hotspot update operations for existing library cursors
use std::path::Path;
use tauri::AppHandle;

/// Update an existing library cursor with a new click point by directly modifying the .cur file
#[tauri::command]
pub fn update_library_cursor_click_point(
    app: AppHandle,
    id: String,
    click_point_x: u16,
    click_point_y: u16,
) -> Result<LibraryCursor, String> {
    // First, get the existing cursor info from the library
    let library = load_library(&app)?;
    let existing_cursor = library
        .cursors
        .iter()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("Cursor with id {} not found in library", id))?;

    let file_path = &existing_cursor.file_path;
    let path = Path::new(file_path);

    // Only update .cur files (not .ani files which are more complex)
    if path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .as_deref()
        != Some("cur")
    {
        return Err("Only .cur files can be updated directly. For .ani files, please re-upload the original image.".to_string());
    }

    // Read the existing .cur file
    let mut bytes =
        fs::read(file_path).map_err(|e| format!("Failed to read cursor file: {}", e))?;

    // The click point is stored in the ICONDIRENTRY structure at offset 10 and 12
    // Format: ICONDIRENTRY (16 bytes)
    //   offset 10: click point X position (u16, little-endian, also known as hotspot)
    //   offset 12: click point Y position (u16, little-endian, also known as hotspot)

    if bytes.len() < 22 {
        // Minimum size: 6 (ICONDIR) + 16 (ICONDIRENTRY) = 22 bytes
        return Err("Invalid cursor file format".to_string());
    }

    // Update click point coordinates (little-endian format)
    bytes[10] = (click_point_x & 0xFF) as u8; // Low byte of X
    bytes[11] = ((click_point_x >> 8) & 0xFF) as u8; // High byte of X
    bytes[12] = (click_point_y & 0xFF) as u8; // Low byte of Y
    bytes[13] = ((click_point_y >> 8) & 0xFF) as u8; // High byte of Y

    // Write the updated bytes back to the file
    fs::write(file_path, bytes)
        .map_err(|e| format!("Failed to write updated cursor file: {}", e))?;

    // Update the library entry with the new hotspot coordinates
    let updated_cursor = update_cursor_in_library(
        app,
        id,
        existing_cursor.name.clone(),      // Keep the same name
        existing_cursor.file_path.clone(), // Keep the same file path
        click_point_x,
        click_point_y,
    )?;

    // Start of new sync logic
    // REFACTOR: This Logic has been moved to update_cursor_in_library to be centralized
    // The call to update_cursor_in_library above will handle syncing active cursors.

    Ok(updated_cursor)
}
