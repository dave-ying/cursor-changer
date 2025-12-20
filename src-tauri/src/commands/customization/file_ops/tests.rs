/// Unit tests for file operations module
use super::*;
use std::fs;
use tempfile::TempDir;

/// Test file browsing - this is primarily tested through integration tests
/// since it requires UI dialog interaction

/// Test file reading/writing operations
#[test]
fn test_read_cursor_file_as_data_url_png() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let file_path = temp_dir.path().join("test.png");

    // Create a minimal PNG file (1x1 pixel)
    let png_data = vec![
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77,
        0x53, 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x63, 0xF8, 0xFF,
        0xFF, 0x3F, 0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00, 0x00,
        0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    fs::write(&file_path, &png_data).expect("Failed to write PNG");

    let result = reading::read_cursor_file_as_data_url(file_path.to_string_lossy().to_string());

    assert!(result.is_ok(), "Failed to read PNG file");
    let data_url = result.unwrap();
    assert!(
        data_url.starts_with("data:image/png;base64,"),
        "Invalid PNG data URL"
    );
}

#[test]
fn test_read_cursor_file_as_data_url_svg() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let file_path = temp_dir.path().join("test.svg");

    let svg_content = r#"<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="15" fill="red"/></svg>"#;
    fs::write(&file_path, svg_content).expect("Failed to write SVG");

    let result = reading::read_cursor_file_as_data_url(file_path.to_string_lossy().to_string());

    assert!(result.is_ok(), "Failed to read SVG file");
    let data_url = result.unwrap();
    assert!(
        data_url.starts_with("data:image/svg+xml;charset=utf-8,"),
        "Invalid SVG data URL"
    );
}

#[test]
fn test_read_cursor_file_as_data_url_nonexistent() {
    let result = reading::read_cursor_file_as_data_url("nonexistent_file.png".to_string());

    assert!(result.is_err(), "Should fail for nonexistent file");
    let error = result.unwrap_err();
    assert!(
        error.contains("not found") || error.contains("File not found"),
        "Error should mention file not found"
    );
}

#[test]
fn test_read_cursor_file_as_bytes() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let file_path = temp_dir.path().join("test.txt");
    let test_data = b"Hello, World!";

    fs::write(&file_path, test_data).expect("Failed to write file");

    let result = reading::read_cursor_file_as_bytes(file_path.to_string_lossy().to_string());

    assert!(result.is_ok(), "Failed to read file as bytes");
    let bytes = result.unwrap();
    assert_eq!(bytes, test_data, "Bytes don't match");
}

#[test]
fn test_read_cursor_file_as_bytes_nonexistent() {
    let result = reading::read_cursor_file_as_bytes("nonexistent_file.txt".to_string());

    assert!(result.is_err(), "Should fail for nonexistent file");
    let error = result.unwrap_err();
    assert!(
        error.contains("not found") || error.contains("File not found"),
        "Error should mention file not found"
    );
}

#[test]
fn test_get_cursor_with_click_point_nonexistent() {
    let result = preview::get_cursor_with_click_point("nonexistent_cursor.cur".to_string());

    assert!(result.is_err(), "Should fail for nonexistent file");
    if let Err(error) = result {
        assert!(
            error.contains("not found") || error.contains("File not found"),
            "Error should mention file not found"
        );
    }
}

/// Test path validation - invalid paths should be handled gracefully
#[test]
fn test_read_with_invalid_path() {
    // Test with various invalid path characters (Windows)
    let invalid_paths = vec![
        "test<file>.cur",
        "test>file.cur",
        "test:file.cur",
        "test\"file.cur",
        "test|file.cur",
        "test?file.cur",
        "test*file.cur",
    ];

    for path in invalid_paths {
        let result = reading::read_cursor_file_as_data_url(path.to_string());
        // Should return an error, not panic
        assert!(
            result.is_err(),
            "Invalid path should return error: {}",
            path
        );
    }
}

/// Test that file operations handle empty files correctly
#[test]
fn test_read_empty_file() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let file_path = temp_dir.path().join("empty.txt");

    // Create empty file
    fs::write(&file_path, b"").expect("Failed to write empty file");

    let result = reading::read_cursor_file_as_bytes(file_path.to_string_lossy().to_string());

    assert!(result.is_ok(), "Should handle empty file");
    let bytes = result.unwrap();
    assert_eq!(bytes.len(), 0, "Empty file should have 0 bytes");
}
