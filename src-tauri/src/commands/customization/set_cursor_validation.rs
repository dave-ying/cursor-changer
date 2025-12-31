use super::file_ops::convert_image_to_cur;
use crate::cursor_converter;
/// File validation utilities for cursor operations
use std::path::Path;
use tauri::{AppHandle, Runtime};

const SUPPORTED_IMAGE_EXTS: [&str; 6] = ["svg", "png", "ico", "bmp", "jpg", "jpeg"];
const SUPPORTED_CURSOR_EXTS: [&str; 2] = ["cur", "ani"];

fn file_extension_lower(path: &Path) -> String {
    path.extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default()
}

fn is_supported_image_ext(ext: &str) -> bool {
    SUPPORTED_IMAGE_EXTS.contains(&ext)
}

fn is_supported_cursor_ext(ext: &str) -> bool {
    SUPPORTED_CURSOR_EXTS.contains(&ext)
}

/// Validate and process a cursor file
pub fn validate_cursor_file<R: Runtime>(image_path: &str, app: &AppHandle<R>) -> Result<String, String> {
    if image_path.is_empty() {
        return Ok(image_path.to_string());
    }

    let path = Path::new(image_path);
    if !path.exists() {
        return Err(format!("File not found: {}", image_path));
    }

    let ext = file_extension_lower(path);

    // Check if conversion is needed
    if is_supported_image_ext(&ext) {
        // Convert to .CUR format
        convert_image_to_cur(image_path, app)
    } else if is_supported_cursor_ext(&ext) {
        // Use as-is
        Ok(image_path.to_string())
    } else {
        Err(format!("Unsupported file type: .{}", ext))
    }
}

/// Validate cursor size (32-MAX_CURSOR_SIZE px range)
pub fn validate_cursor_size(size: i32) -> Result<(), String> {
    let max_size = cursor_converter::MAX_CURSOR_SIZE as i32;
    if size < 32 || size > max_size {
        Err(format!(
            "Invalid cursor size: {}. Must be between 32 and {} pixels.",
            size, max_size
        ))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn supported_image_exts_allowlist_is_correct() {
        for ext in SUPPORTED_IMAGE_EXTS {
            assert!(is_supported_image_ext(ext));
        }

        assert!(!is_supported_image_ext("cur"));
        assert!(!is_supported_image_ext("ani"));
        assert!(!is_supported_image_ext("webp"));
    }

    #[test]
    fn supported_cursor_exts_allowlist_is_correct() {
        for ext in SUPPORTED_CURSOR_EXTS {
            assert!(is_supported_cursor_ext(ext));
        }

        assert!(!is_supported_cursor_ext("png"));
        assert!(!is_supported_cursor_ext("svg"));
    }

    #[test]
    fn file_extension_lower_normalizes_case_and_handles_missing_ext() {
        assert_eq!(file_extension_lower(Path::new("test.PNG")), "png");
        assert_eq!(file_extension_lower(Path::new("test")), "");
    }
}
