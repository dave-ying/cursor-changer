use super::conversion::{convert_image_bytes_to_cur, convert_image_bytes_to_cur_with_click_point};
use super::preview::get_cursor_with_click_point;
use crate::commands::customization::library::{add_cursor_to_library, LibraryCursor};
/// Library integration operations for cursor uploads
use std::path::Path;
use tauri::AppHandle;

/// Accept an uploaded file as raw bytes, convert if necessary (without saving source image),
/// extract hotspot info and add the resulting .cur/.ani file to the library.
///
/// IMPORTANT: The original source image is NEVER saved to disk. Only the converted .cur file
/// is stored in the library folder.
#[tauri::command]
pub fn add_uploaded_cursor_to_library(
    app: AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<LibraryCursor, String> {
    // Determine extension from the filename
    let ext = Path::new(&filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    // Get the cursors folder path
    let cursors_dir = crate::paths::cursors_dir()?;

    // If the file is an image, convert it directly to .cur WITHOUT saving the source image.
    // If already .cur/.ani, save it directly to the cursors folder.
    let final_path = if ext == "svg"
        || ext == "png"
        || ext == "ico"
        || ext == "bmp"
        || ext == "jpg"
        || ext == "jpeg"
    {
        // Convert image bytes directly to .cur without saving the source image
        convert_image_bytes_to_cur(&data, &filename, &app)?
    } else if ext == "cur" || ext == "ani" {
        // For .cur/.ani files, save directly to the cursors folder
        let file_path = cursors_dir.join(&filename);
        let file_path_str = file_path.to_string_lossy().to_string();

        std::fs::write(&file_path_str, &data)
            .map_err(|e| format!("Failed to save cursor file: {}", e))?;

        file_path_str
    } else {
        return Err(format!("Unsupported file type: .{}", ext));
    };

    // Extract click point information from the final .cur/.ani file
    let click_point_info = get_cursor_with_click_point(final_path.clone())?;

    // Derive a friendly name from the uploaded filename (file stem)
    let name = Path::new(&filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Custom Cursor")
        .to_string();

    // Add to library using existing library logic
    let cursor = add_cursor_to_library(
        app,
        name,
        final_path,
        click_point_info.click_point_x,
        click_point_info.click_point_y,
    )?;

    Ok(cursor)
}

/// Accept an uploaded raster/vector image, prompt for hotspot on the frontend,
/// then convert using the provided hotspot and add to library.
///
/// IMPORTANT: The original source image is NEVER saved to disk. Only the converted .cur file
/// is stored in the library folder.
#[tauri::command]
pub fn add_uploaded_image_with_click_point_to_library(
    app: AppHandle,
    filename: String,
    data: Vec<u8>,
    size: u32,
    click_point_x: u16,
    click_point_y: u16,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<LibraryCursor, String> {
    // Determine extension from the filename (NOT from a saved file)
    let ext = Path::new(&filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    // Get the cursors folder path
    let cursors_dir = crate::paths::cursors_dir()?;

    // Handle .cur files: save to cursors folder and modify the hotspot bytes directly
    // Handle image files: convert to .cur with the specified hotspot WITHOUT saving source
    let final_path = if ext == "cur" {
        // For .cur files, save to cursors folder and modify the hotspot bytes
        let file_path = cursors_dir.join(&filename);
        let file_path_str = file_path.to_string_lossy().to_string();

        let mut bytes = data;

        // Validate minimum size for CUR format (ICONDIR + ICONDIRENTRY = 22 bytes)
        if bytes.len() < 22 {
            return Err("Invalid .cur file: too small".to_string());
        }

        // Modify hotspot bytes at offsets 10-13 (ICONDIRENTRY hotspot fields)
        bytes[10] = (click_point_x & 0xFF) as u8; // Low byte of X
        bytes[11] = ((click_point_x >> 8) & 0xFF) as u8; // High byte of X
        bytes[12] = (click_point_y & 0xFF) as u8; // Low byte of Y
        bytes[13] = ((click_point_y >> 8) & 0xFF) as u8; // High byte of Y

        // Write the modified file directly to cursors folder
        std::fs::write(&file_path_str, &bytes)
            .map_err(|e| format!("Failed to write .cur file: {}", e))?;

        file_path_str
    } else {
        // For image files, validate the extension
        let is_image = matches!(ext.as_str(), "svg" | "png" | "ico" | "bmp" | "jpg" | "jpeg");
        if !is_image {
            return Err(format!(
                "Unsupported image type for hotspot picker: .{}",
                ext
            ));
        }

        // Convert image bytes directly to .cur WITHOUT saving the source image
        convert_image_bytes_to_cur_with_click_point(
            &data,
            &filename,
            size,
            click_point_x,
            click_point_y,
            scale,
            offset_x,
            offset_y,
        )?
    };

    // Extract click point information from the final .cur file (for completeness)
    let click_point_info = get_cursor_with_click_point(final_path.clone())?;

    // Derive a friendly name from the original filename (file stem)
    let name = Path::new(&filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Custom Cursor")
        .to_string();

    // Add to library
    let cursor = add_cursor_to_library(
        app,
        name,
        final_path,
        click_point_info.click_point_x,
        click_point_info.click_point_y,
    )?;

    Ok(cursor)
}
