/// Regression test for Bug: Corrupted image files cause panic
///
/// **Original Issue:**
/// When users attempted to load corrupted or invalid image files (PNG, SVG, etc.),
/// the application would panic instead of handling the error gracefully. This
/// resulted in application crashes and poor user experience.
///
/// **Steps to Reproduce:**
/// 1. Attempt to convert a corrupted PNG file
/// 2. Attempt to convert a corrupted SVG file
/// 3. Attempt to convert an empty file
/// 4. Application panics in each case
///
/// **Expected Behavior:**
/// The application should detect corrupted or invalid files and return
/// descriptive error messages without crashing.
///
/// **Actual Behavior (before fix):**
/// Application panicked when encountering corrupted files, leaving the
/// application in an unstable state.
///
/// **Fixed in:** Initial implementation with proper error handling
/// **Date Fixed:** 2024-11-18
///
/// **Test Verification:**
/// This test verifies that corrupted image files are handled gracefully
/// with appropriate error messages rather than causing panics.
#[test]
fn regression_corrupted_png_handled_gracefully() {
    use cursor_changer_tauri::cursor_converter::convert_to_cur;
    use std::fs;

    // Arrange: Create a corrupted PNG file
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("corrupted.png");
    let output_path = temp_dir.path().join("test.cur");

    fs::write(&input_path, b"This is not a valid PNG file")
        .expect("Failed to write corrupted file");

    // Act: Attempt to convert corrupted file
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Assert: Should return error, not panic
    assert!(result.is_err(), "Corrupted PNG should be rejected");

    // Verify error is descriptive
    let error = result.unwrap_err();
    assert!(!error.is_empty(), "Error message should not be empty");
}

#[test]
fn regression_corrupted_svg_handled_gracefully() {
    use cursor_changer_tauri::cursor_converter::convert_to_cur;
    use std::fs;

    // Arrange: Create a corrupted SVG file
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("corrupted.svg");
    let output_path = temp_dir.path().join("test.cur");

    fs::write(&input_path, b"<svg>This is not valid SVG").expect("Failed to write corrupted file");

    // Act: Attempt to convert corrupted file
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Assert: Should return error, not panic
    assert!(result.is_err(), "Corrupted SVG should be rejected");
}

#[test]
fn regression_empty_file_handled_gracefully() {
    use cursor_changer_tauri::cursor_converter::convert_to_cur;
    use std::fs;

    // Arrange: Create an empty file
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("empty.png");
    let output_path = temp_dir.path().join("test.cur");

    fs::write(&input_path, b"").expect("Failed to write empty file");

    // Act: Attempt to convert empty file
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Assert: Should return error, not panic
    assert!(result.is_err(), "Empty file should be rejected");
}

#[test]
fn regression_missing_file_handled_gracefully() {
    use cursor_changer_tauri::cursor_converter::convert_to_cur;

    // Arrange: Use a non-existent file path
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("nonexistent.png");
    let output_path = temp_dir.path().join("test.cur");

    // Act: Attempt to convert non-existent file
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Assert: Should return error, not panic
    assert!(result.is_err(), "Missing file should be rejected");

    // Verify error mentions file issue
    let error = result.unwrap_err();
    assert!(
        error.contains("Failed to")
            || error.contains("No such file")
            || error.contains("not found"),
        "Error should indicate file issue: {}",
        error
    );
}
