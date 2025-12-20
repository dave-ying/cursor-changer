use crate::cursor_converter;
use crate::state::types::CursorClickPointInfo;
use crate::utils::cursor_parser::parse_cur_click_point;
use crate::utils::encoding::base64_encode;
/// Preview and click point information operations
use std::path::Path;

/// Get cursor file with click point information
#[tauri::command]
pub fn get_cursor_with_click_point(file_path: String) -> Result<CursorClickPointInfo, String> {
    use std::fs;

    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Read the file bytes
    let bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Parse click point from .CUR file
    let (click_point_x, click_point_y) = parse_cur_click_point(&bytes);

    // Get dimensions from the cursor file
    // Width and height are at offset 6 and 7 in ICONDIRENTRY
    // If 0, it means MAX_CURSOR_SIZE pixels
    let width = if bytes.len() > 6 && bytes[6] != 0 {
        bytes[6] as u16
    } else {
        cursor_converter::MAX_CURSOR_SIZE as u16
    };
    let height = if bytes.len() > 7 && bytes[7] != 0 {
        bytes[7] as u16
    } else {
        cursor_converter::MAX_CURSOR_SIZE as u16
    };

    // Encode as base64
    let base64 = base64_encode(&bytes);

    // Determine MIME type based on extension
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    let mime_type = match ext.as_str() {
        "cur" => "image/x-icon",
        "ani" => "application/x-navi-animation",
        _ => "application/octet-stream",
    };

    let data_url = format!("data:{};base64,{}", mime_type, base64);

    Ok(CursorClickPointInfo {
        data_url,
        click_point_x,
        click_point_y,
        width,
        height,
    })
}

/// Render image preview, converting SVGs to PNG for reliable browser display
#[tauri::command]
pub fn render_cursor_image_preview(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    if ext == "svg" {
        // Render SVG to PNG bytes to avoid WebView rendering quirks
        match cursor_converter::svg_handler::render_svg_to_png_bytes(
            &file_path,
            cursor_converter::MAX_CURSOR_SIZE,
        ) {
            Ok(png_bytes) => {
                let base64 = base64_encode(&png_bytes);
                return Ok(format!("data:image/png;base64,{}", base64));
            }
            Err(e) => {
                // Provide more context for the frontend so DevTools shows actionable diagnostics
                let msg = format!("Failed to render SVG preview for '{}': {}", file_path, e);
                cc_error!("[render_cursor_image_preview] {}", msg);
                return Err(msg);
            }
        }
    }

    // Non-SVG: fall back to data URL (base64)
    super::reading::read_cursor_file_as_data_url(file_path)
}
