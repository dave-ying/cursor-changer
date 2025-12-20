/// Regression test for Bug: Oversized cursor causes application crash
///
/// **Original Issue:**
/// When users attempted to convert cursor images larger than 256x256 pixels,
/// the application would crash instead of gracefully rejecting the input with
/// an error message. This left the application in an unstable state and could
/// result in data loss.
///
/// **Steps to Reproduce:**
/// 1. Attempt to convert an image larger than 256x256 (e.g., 257x257)
/// 2. Application crashes without error message
/// 3. User loses any unsaved work
///
/// **Expected Behavior:**
/// The application should validate cursor dimensions before processing and
/// return a clear error message indicating the size limit (256x256 maximum).
///
/// **Actual Behavior (before fix):**
/// Application crashed with panic or undefined behavior when processing
/// oversized images.
///
/// **Fixed in:** Initial implementation with proper validation
/// **Date Fixed:** 2024-11-18
///
/// **Test Verification:**
/// This test verifies that oversized cursor images are rejected with a
/// descriptive error message rather than causing a crash.
#[test]
fn regression_oversized_cursor_validation() {
    use cursor_changer_tauri::cursor_converter::generate_cur_data;
    use image::{ImageBuffer, Rgba};

    // Arrange: Create an oversized cursor image (257x257)
    let oversized_image = ImageBuffer::from_fn(257, 257, |x, y| {
        let r = ((x * 255) / 257) as u8;
        let g = ((y * 255) / 257) as u8;
        Rgba([r, g, 128, 255])
    });

    // Act: Attempt to generate cursor data from oversized image
    let result = generate_cur_data(&oversized_image, 0, 0);

    // Assert: Should return error, not crash
    assert!(result.is_err(), "Oversized cursor should be rejected");

    // Verify error message is descriptive
    let error = result.unwrap_err();
    assert!(
        error.contains("256") || error.contains("size") || error.contains("maximum"),
        "Error should mention size limit: {}",
        error
    );
}

/// Additional test: Verify maximum valid size still works
#[test]
fn regression_maximum_valid_size_accepted() {
    use cursor_changer_tauri::cursor_converter::generate_cur_data;
    use image::{ImageBuffer, Rgba};

    // Arrange: Create a cursor at maximum valid size (256x256)
    let max_size_image = ImageBuffer::from_fn(256, 256, |x, y| Rgba([x as u8, y as u8, 128, 255]));

    // Act: Generate cursor data
    let result = generate_cur_data(&max_size_image, 0, 0);

    // Assert: Should succeed
    assert!(
        result.is_ok(),
        "Maximum valid size (256x256) should be accepted: {:?}",
        result.err()
    );
}
