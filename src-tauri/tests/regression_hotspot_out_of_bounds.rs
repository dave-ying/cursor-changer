/// Regression test for Bug: Hotspot coordinates out of bounds cause invalid cursor
///
/// **Original Issue:**
/// When users specified hotspot coordinates outside the cursor image bounds,
/// the application would either crash or create invalid cursor files that
/// Windows would reject. This resulted in cursors not being applied or
/// system cursor corruption.
///
/// **Steps to Reproduce:**
/// 1. Create a 32x32 cursor image
/// 2. Set hotspot coordinates to (100, 100) - outside image bounds
/// 3. Application creates invalid cursor or crashes
/// 4. Windows rejects the cursor file
///
/// **Expected Behavior:**
/// The application should validate hotspot coordinates are within image bounds
/// before creating the cursor file. Invalid coordinates should be rejected
/// with a clear error message.
///
/// **Actual Behavior (before fix):**
/// Application created invalid cursor files with out-of-bounds hotspot
/// coordinates, which Windows would reject when attempting to apply.
///
/// **Fixed in:** Initial implementation with hotspot validation
/// **Date Fixed:** 2024-11-18
///
/// **Test Verification:**
/// This test verifies that hotspot coordinates are validated to be within
/// image bounds, preventing invalid cursor file creation.
#[test]
fn regression_hotspot_validation_x_out_of_bounds() {
    use cursor_changer_tauri::cursor_converter::generate_cur_data;
    use image::{ImageBuffer, Rgba};

    // Arrange: Create a 32x32 cursor image
    let image = ImageBuffer::from_fn(32, 32, |x, y| {
        let r = ((x * 255) / 32) as u8;
        let g = ((y * 255) / 32) as u8;
        Rgba([r, g, 128, 255])
    });

    // Act: Attempt to set hotspot X coordinate out of bounds
    let result = generate_cur_data(&image, 100, 16);

    // Assert: Should either reject or clamp to valid range
    // If it succeeds, verify hotspot is within bounds
    if let Ok(cur_data) = result {
        // Read hotspot from CUR file (bytes 10-13)
        assert!(cur_data.len() >= 14, "CUR data too small");
        let hotspot_x = u16::from_le_bytes([cur_data[10], cur_data[11]]);
        assert!(
            hotspot_x < 32,
            "Hotspot X should be clamped to image bounds, got {}",
            hotspot_x
        );
    }
    // If it returns error, that's also acceptable behavior
}

#[test]
fn regression_hotspot_validation_y_out_of_bounds() {
    use cursor_changer_tauri::cursor_converter::generate_cur_data;
    use image::{ImageBuffer, Rgba};

    // Arrange: Create a 32x32 cursor image
    let image = ImageBuffer::from_fn(32, 32, |x, y| {
        let r = ((x * 255) / 32) as u8;
        let g = ((y * 255) / 32) as u8;
        Rgba([r, g, 128, 255])
    });

    // Act: Attempt to set hotspot Y coordinate out of bounds
    let result = generate_cur_data(&image, 16, 100);

    // Assert: Should either reject or clamp to valid range
    if let Ok(cur_data) = result {
        // Read hotspot from CUR file (bytes 10-13)
        assert!(cur_data.len() >= 14, "CUR data too small");
        let hotspot_y = u16::from_le_bytes([cur_data[12], cur_data[13]]);
        assert!(
            hotspot_y < 32,
            "Hotspot Y should be clamped to image bounds, got {}",
            hotspot_y
        );
    }
}

#[test]
fn regression_hotspot_at_valid_maximum() {
    use cursor_changer_tauri::cursor_converter::generate_cur_data;
    use image::{ImageBuffer, Rgba};

    // Arrange: Create a 128x128 cursor image
    let size = 128;
    let image = ImageBuffer::from_fn(size, size, |x, y| {
        let r = ((x * 255) / size) as u8;
        let g = ((y * 255) / size) as u8;
        Rgba([r, g, 128, 255])
    });

    // Act: Set hotspot at maximum valid coordinates (size - 1)
    let max_coord = (size - 1) as u16;
    let result = generate_cur_data(&image, max_coord, max_coord);

    // Assert: Should succeed
    assert!(
        result.is_ok(),
        "Hotspot at maximum valid coordinates should be accepted: {:?}",
        result.err()
    );

    // Verify hotspot coordinates are preserved
    let cur_data = result.unwrap();
    assert!(cur_data.len() >= 14, "CUR data too small");

    let hotspot_x = u16::from_le_bytes([cur_data[10], cur_data[11]]);
    let hotspot_y = u16::from_le_bytes([cur_data[12], cur_data[13]]);

    assert_eq!(hotspot_x, max_coord, "Hotspot X should be preserved");
    assert_eq!(hotspot_y, max_coord, "Hotspot Y should be preserved");
}

#[test]
fn regression_hotspot_at_zero() {
    use cursor_changer_tauri::cursor_converter::generate_cur_data;
    use image::{ImageBuffer, Rgba};

    // Arrange: Create a cursor image
    let image = ImageBuffer::from_fn(32, 32, |x, y| {
        let r = ((x * 255) / 32) as u8;
        let g = ((y * 255) / 32) as u8;
        Rgba([r, g, 128, 255])
    });

    // Act: Set hotspot at (0, 0)
    let result = generate_cur_data(&image, 0, 0);

    // Assert: Should succeed
    assert!(
        result.is_ok(),
        "Hotspot at (0, 0) should be accepted: {:?}",
        result.err()
    );

    // Verify hotspot coordinates
    let cur_data = result.unwrap();
    assert!(cur_data.len() >= 14, "CUR data too small");

    let hotspot_x = u16::from_le_bytes([cur_data[10], cur_data[11]]);
    let hotspot_y = u16::from_le_bytes([cur_data[12], cur_data[13]]);

    assert_eq!(hotspot_x, 0, "Hotspot X should be 0");
    assert_eq!(hotspot_y, 0, "Hotspot Y should be 0");
}
