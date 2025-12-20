use crate::utils::encoding::base64_encode;
/// File reading operations for cursor files
use std::path::Path;

/// Read cursor file as data URL
#[tauri::command]
pub fn read_cursor_file_as_data_url(file_path: String) -> Result<String, String> {
    use std::fs;

    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Read the file bytes
    let bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    // Determine extension
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    // Special-case SVG: prefer a percent-encoded text data URL which is
    // generally more compatible when loading into an HTMLImageElement
    // (some WebView2 versions have quirks with certain SVG content and
    // base64-encoded SVG data URLs). If we cannot interpret the bytes as
    // UTF-8, fall back to base64.
    if ext == "svg" {
        // Try to treat the bytes as UTF-8 text and percent-encode them.
        match std::str::from_utf8(&bytes) {
            Ok(text) => {
                // Percent-encode each byte to ensure a safe data URL.
                let mut encoded = String::with_capacity(bytes.len() * 3);
                for &b in text.as_bytes() {
                    // Encode all bytes as %HH - conservative but robust.
                    encoded.push_str(&format!("%{:02X}", b));
                }

                return Ok(format!("data:image/svg+xml;charset=utf-8,{}", encoded));
            }
            Err(_) => {
                // Fallback to base64 if the file isn't valid UTF-8
                let base64 = base64_encode(&bytes);
                return Ok(format!("data:image/svg+xml;base64,{}", base64));
            }
        }
    }

    // Handle ANI files by extracting first frame and converting to displayable PNG
    // ANI files use RIFF container format which browsers can't display directly
    if ext == "ani" {
        // Delegate to the library preview function which has full ANI parsing
        return crate::commands::customization::library::get_library_cursor_preview(file_path);
    }

    // Non-SVG files: encode as base64 and return with an appropriate MIME type
    let base64 = base64_encode(&bytes);

    let mime_type = match ext.as_str() {
        "cur" => "image/x-icon",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    };

    Ok(format!("data:{};base64,{}", mime_type, base64))
}

/// Read cursor file as raw bytes (for Blob/object URL in frontend)
#[tauri::command]
pub fn read_cursor_file_as_bytes(file_path: String) -> Result<Vec<u8>, String> {
    use std::fs;

    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    // Read and return raw bytes
    fs::read(path).map_err(|e| format!("Failed to read file: {}", e))
}
