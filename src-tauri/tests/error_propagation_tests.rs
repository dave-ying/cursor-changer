//! Unit tests for Rust error propagation
//!
//! Tests that errors are properly propagated through the Result type
//! and that error messages are descriptive.
//!
//! Requirements: 5.5

use cursor_changer_tauri::cursor_converter::{convert_to_cur, load_raster_image, load_svg};
use std::fs;
use tempfile::TempDir;

#[test]
fn test_convert_to_cur_propagates_file_not_found_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let nonexistent_input = temp_dir.path().join("nonexistent.png");
    let output = temp_dir.path().join("output.cur");

    let result = convert_to_cur(
        nonexistent_input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Should return an error
    assert!(result.is_err(), "Should return error for nonexistent file");

    // Error message should be descriptive
    let error_msg = result.unwrap_err();
    assert!(!error_msg.is_empty(), "Error message should not be empty");

    let error_lower = error_msg.to_lowercase();
    assert!(
        error_lower.contains("failed")
            || error_lower.contains("not found")
            || error_lower.contains("no such file")
            || error_lower.contains("error"),
        "Error message should be descriptive: '{}'",
        error_msg
    );
}

#[test]
fn test_convert_to_cur_propagates_invalid_extension_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let input = temp_dir.path().join("test.txt");
    let output = temp_dir.path().join("output.cur");

    // Create a text file
    fs::write(&input, b"not an image").expect("Failed to write test file");

    let result = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Should return an error
    assert!(
        result.is_err(),
        "Should return error for unsupported file type"
    );

    // Error message should mention unsupported type
    let error_msg = result.unwrap_err();
    assert!(
        error_msg.to_lowercase().contains("unsupported")
            || error_msg.to_lowercase().contains("txt"),
        "Error should mention unsupported file type: '{}'",
        error_msg
    );
}

#[test]
fn test_convert_to_cur_propagates_no_extension_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let input = temp_dir.path().join("noextension");
    let output = temp_dir.path().join("output.cur");

    // Create a file without extension
    fs::write(&input, b"data").expect("Failed to write test file");

    let result = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Should return an error
    assert!(
        result.is_err(),
        "Should return error for file without extension"
    );

    // Error message should mention extension
    let error_msg = result.unwrap_err();
    assert!(
        error_msg.to_lowercase().contains("extension"),
        "Error should mention extension: '{}'",
        error_msg
    );
}

#[test]
fn test_load_svg_propagates_file_not_found_error() {
    let result = load_svg("/nonexistent/path/file.svg", 32, 1.0, 0, 0);

    // Should return an error
    assert!(result.is_err(), "Should return error for nonexistent SVG");

    // Error message should be descriptive
    let error_msg = result.unwrap_err();
    assert!(!error_msg.is_empty(), "Error message should not be empty");
}

#[test]
fn test_load_svg_propagates_invalid_svg_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let svg_path = temp_dir.path().join("invalid.svg");

    // Write invalid SVG content
    fs::write(&svg_path, b"not valid svg").expect("Failed to write invalid SVG");

    let result = load_svg(svg_path.to_str().unwrap(), 32, 1.0, 0, 0);

    // Should return an error
    assert!(result.is_err(), "Should return error for invalid SVG");

    // Error message should be descriptive
    let error_msg = result.unwrap_err();
    assert!(!error_msg.is_empty(), "Error message should not be empty");
}

#[test]
fn test_load_raster_image_propagates_file_not_found_error() {
    let result = load_raster_image("/nonexistent/path/file.png", 32, 1.0, 0, 0);

    // Should return an error
    assert!(result.is_err(), "Should return error for nonexistent image");

    // Error message should be descriptive
    let error_msg = result.unwrap_err();
    assert!(!error_msg.is_empty(), "Error message should not be empty");
}

#[test]
fn test_load_raster_image_propagates_invalid_image_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let image_path = temp_dir.path().join("invalid.png");

    // Write invalid image content
    fs::write(&image_path, b"not a valid png").expect("Failed to write invalid image");

    let result = load_raster_image(image_path.to_str().unwrap(), 32, 1.0, 0, 0);

    // Should return an error
    assert!(result.is_err(), "Should return error for invalid image");

    // Error message should be descriptive
    let error_msg = result.unwrap_err();
    assert!(!error_msg.is_empty(), "Error message should not be empty");
}

#[test]
fn test_error_messages_are_not_generic() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let input = temp_dir.path().join("test.xyz");
    let output = temp_dir.path().join("output.cur");

    fs::write(&input, b"data").expect("Failed to write test file");

    let result = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Error message should not be just "Error" or "Failed"
    let error_msg = result.unwrap_err();
    assert!(
        error_msg.len() > 10,
        "Error message should be descriptive, not generic: '{}'",
        error_msg
    );
}

#[test]
fn test_error_chain_preserves_context() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let input = temp_dir.path().join("test.png");
    let output = temp_dir.path().join("nonexistent_dir/output.cur");

    // Create a valid input but invalid output path
    let image = image::ImageBuffer::from_pixel(32, 32, image::Rgba([255u8, 0u8, 0u8, 255u8]));
    image.save(&input).expect("Failed to save test image");

    let result = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Should return an error about writing
    assert!(
        result.is_err(),
        "Should return error for invalid output path"
    );

    // Error message should mention writing or output
    let error_msg = result.unwrap_err();
    let error_lower = error_msg.to_lowercase();
    assert!(
        error_lower.contains("write")
            || error_lower.contains("failed")
            || error_lower.contains("output"),
        "Error should mention write failure: '{}'",
        error_msg
    );
}

#[test]
fn test_errors_dont_panic() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Try various invalid operations - none should panic
    let _ = convert_to_cur("", "", 0, 0, 0, 1.0, 0, 0);
    let _ = convert_to_cur("/nonexistent", "/output", 32, 0, 0, 1.0, 0, 0);
    let _ = load_svg("", 32, 1.0, 0, 0);
    let _ = load_raster_image("", 32, 1.0, 0, 0);

    // Create invalid files
    let invalid_svg = temp_dir.path().join("invalid.svg");
    let invalid_png = temp_dir.path().join("invalid.png");
    fs::write(&invalid_svg, b"invalid").expect("Failed to write");
    fs::write(&invalid_png, b"invalid").expect("Failed to write");

    let _ = load_svg(invalid_svg.to_str().unwrap(), 32, 1.0, 0, 0);
    let _ = load_raster_image(invalid_png.to_str().unwrap(), 32, 1.0, 0, 0);

    // If we got here, no panics occurred
    assert!(true, "All error cases handled without panicking");
}

#[test]
fn test_error_logging_includes_context() {
    // This test verifies that errors include enough context for debugging
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let input = temp_dir.path().join("test.unsupported");
    let output = temp_dir.path().join("output.cur");

    fs::write(&input, b"data").expect("Failed to write test file");

    let result = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    let error_msg = result.unwrap_err();

    // Error should include the problematic extension
    assert!(
        error_msg.contains("unsupported"),
        "Error should include context about what went wrong: '{}'",
        error_msg
    );
}

#[test]
fn test_multiple_error_sources_are_distinguishable() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Error from missing file
    let result1 = convert_to_cur("/nonexistent.png", "/output.cur", 32, 0, 0, 1.0, 0, 0);
    let error1 = result1.unwrap_err();

    // Error from unsupported extension
    let input2 = temp_dir.path().join("test.txt");
    fs::write(&input2, b"data").expect("Failed to write");
    let result2 = convert_to_cur(input2.to_str().unwrap(), "/output.cur", 32, 0, 0, 1.0, 0, 0);
    let error2 = result2.unwrap_err();

    // Errors should be different and distinguishable
    assert_ne!(
        error1, error2,
        "Different error types should have different messages"
    );

    // First error should mention file/path issues
    let error1_lower = error1.to_lowercase();
    assert!(
        error1_lower.contains("failed") || error1_lower.contains("not found"),
        "File not found error should be clear: '{}'",
        error1
    );

    // Second error should mention unsupported type
    assert!(
        error2.to_lowercase().contains("unsupported"),
        "Unsupported type error should be clear: '{}'",
        error2
    );
}
