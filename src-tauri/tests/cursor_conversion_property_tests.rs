//! Property-based tests for cursor conversion
//!
//! These tests validate correctness properties across randomly generated inputs
//! to discover edge cases and ensure robust behavior.

use cursor_changer_tauri::cursor_converter::{convert_to_cur, generate_cur_data};
use image::{ImageBuffer, ImageFormat, Rgba};
use proptest::prelude::*;

// Helper function to validate .CUR file format
fn validate_cur_format(data: &[u8]) -> Result<(), String> {
    if data.len() < 22 {
        return Err("CUR file too small".to_string());
    }

    // Check ICONDIR header
    let reserved = u16::from_le_bytes([data[0], data[1]]);
    let image_type = u16::from_le_bytes([data[2], data[3]]);
    let num_images = u16::from_le_bytes([data[4], data[5]]);

    if reserved != 0 {
        return Err(format!("Invalid reserved field: {}", reserved));
    }
    if image_type != 2 {
        return Err(format!(
            "Invalid image type (expected 2 for cursor): {}",
            image_type
        ));
    }
    if num_images != 1 {
        return Err(format!(
            "Invalid number of images (expected 1): {}",
            num_images
        ));
    }

    // Check ICONDIRENTRY (16 bytes starting at offset 6)
    if data.len() < 22 {
        return Err("CUR file missing ICONDIRENTRY".to_string());
    }

    let width = data[6];
    let height = data[7];
    let _color_count = data[8];
    let _reserved = data[9];
    let _hotspot_x = u16::from_le_bytes([data[10], data[11]]);
    let _hotspot_y = u16::from_le_bytes([data[12], data[13]]);
    let image_size = u32::from_le_bytes([data[14], data[15], data[16], data[17]]);
    let image_offset = u32::from_le_bytes([data[18], data[19], data[20], data[21]]);

    // Validate dimensions (0 means 256, which is the maximum)
    let actual_width = if width == 0 { 256 } else { width as u32 };
    let actual_height = if height == 0 { 256 } else { height as u32 };

    if actual_width > 256 || actual_height > 256 {
        return Err(format!(
            "Invalid dimensions: {}x{} (max 256x256)",
            actual_width, actual_height
        ));
    }

    // Validate image offset and size
    if image_offset < 22 {
        return Err(format!("Invalid image offset: {}", image_offset));
    }
    if image_size == 0 {
        return Err("Invalid image size: 0".to_string());
    }
    if (image_offset + image_size) as usize > data.len() {
        return Err(format!(
            "Image data extends beyond file: offset={}, size={}, file_len={}",
            image_offset,
            image_size,
            data.len()
        ));
    }

    Ok(())
}

// Helper function to extract hotspot coordinates from .CUR data
fn extract_hotspot(data: &[u8]) -> Result<(u16, u16), String> {
    if data.len() < 14 {
        return Err("CUR file too small to extract hotspot".to_string());
    }

    let hotspot_x = u16::from_le_bytes([data[10], data[11]]);
    let hotspot_y = u16::from_le_bytes([data[12], data[13]]);

    Ok((hotspot_x, hotspot_y))
}

// Helper function to create a valid test image
fn create_test_image(width: u32, height: u32, pattern: u8) -> ImageBuffer<Rgba<u8>, Vec<u8>> {
    ImageBuffer::from_fn(width, height, |x, y| {
        let r = ((x + pattern as u32) % 256) as u8;
        let g = ((y + pattern as u32) % 256) as u8;
        let b = ((x + y + pattern as u32) % 256) as u8;
        let a = 255;
        Rgba([r, g, b, a])
    })
}

/// **Feature: app-quality-improvement, Property 1: Valid image input produces valid cursor output**
///
/// For any valid image input (PNG, SVG, ICO, etc.), cursor conversion should produce
/// a valid .cur file that conforms to the Windows cursor format specification.
///
/// **Validates: Requirements 2.1**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_valid_image_produces_valid_cursor(
        width in 16u32..=256u32,
        height in 16u32..=256u32,
        pattern in 0u8..=255u8,
    ) {
        // Create a valid test image
        let image = create_test_image(width, height, pattern);

        // Generate cursor data with default hotspot
        let result = generate_cur_data(&image, 0, 0);

        // Should succeed
        prop_assert!(result.is_ok(), "Failed to generate cursor data: {:?}", result.err());

        let cur_data = result.unwrap();

        // Validate the .CUR format
        let validation = validate_cur_format(&cur_data);
        prop_assert!(validation.is_ok(), "Invalid CUR format: {:?}", validation.err());
    }
}

/// Test property 1 with PNG file conversion
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_png_to_cursor_produces_valid_output(
        size in 16u32..=128u32,
        pattern in 0u8..=255u8,
    ) {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let input_path = temp_dir.path().join("test.png");
        let output_path = temp_dir.path().join("test.cur");

        // Create and save a PNG image
        let image = create_test_image(size, size, pattern);
        image.save_with_format(&input_path, ImageFormat::Png)
            .expect("Failed to save PNG");

        // Convert to cursor
        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            size,
            0,
            0,
            1.0,
            0,
            0,
        );

        prop_assert!(result.is_ok(), "Conversion failed: {:?}", result.err());

        // Read and validate the output
        let cur_data = std::fs::read(&output_path).expect("Failed to read output");
        let validation = validate_cur_format(&cur_data);
        prop_assert!(validation.is_ok(), "Invalid CUR format: {:?}", validation.err());
    }
}

/// Test property 1 with various image formats
proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    #[test]
    fn prop_various_formats_produce_valid_cursors(
        size in 32u32..=128u32,
        format_idx in 0usize..=2usize,
    ) {
        let formats = [
            (ImageFormat::Png, "png"),
            (ImageFormat::Bmp, "bmp"),
            (ImageFormat::Ico, "ico"),
        ];

        let (format, ext) = formats[format_idx];

        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let input_path = temp_dir.path().join(format!("test.{}", ext));
        let output_path = temp_dir.path().join("test.cur");

        // Create and save an image
        let image = create_test_image(size, size, 128);
        image.save_with_format(&input_path, format)
            .expect("Failed to save image");

        // Convert to cursor
        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            size,
            0,
            0,
            1.0,
            0,
            0,
        );

        prop_assert!(result.is_ok(), "Conversion failed for {}: {:?}", ext, result.err());

        // Validate output
        let cur_data = std::fs::read(&output_path).expect("Failed to read output");
        let validation = validate_cur_format(&cur_data);
        prop_assert!(validation.is_ok(), "Invalid CUR format for {}: {:?}", ext, validation.err());
    }
}

/// **Feature: app-quality-improvement, Property 4: Hotspot coordinates are preserved through conversion**
///
/// For any valid hotspot coordinates (x, y within image bounds), converting an image to a cursor
/// should preserve those exact coordinates in the resulting .cur file.
///
/// **Validates: Requirements 2.4**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_hotspot_coordinates_preserved(
        width in 32u32..=256u32,
        height in 32u32..=256u32,
        hotspot_x_ratio in 0.0f32..=1.0f32,
        hotspot_y_ratio in 0.0f32..=1.0f32,
    ) {
        // Calculate hotspot coordinates within image bounds
        let hotspot_x = (width as f32 * hotspot_x_ratio) as u16;
        let hotspot_y = (height as f32 * hotspot_y_ratio) as u16;

        // Create a test image
        let image = create_test_image(width, height, 100);

        // Generate cursor data with specified hotspot
        let result = generate_cur_data(&image, hotspot_x, hotspot_y);
        prop_assert!(result.is_ok(), "Failed to generate cursor data: {:?}", result.err());

        let cur_data = result.unwrap();

        // Extract hotspot from generated cursor
        let extracted = extract_hotspot(&cur_data);
        prop_assert!(extracted.is_ok(), "Failed to extract hotspot: {:?}", extracted.err());

        let (extracted_x, extracted_y) = extracted.unwrap();

        // Verify hotspot coordinates are preserved
        prop_assert_eq!(extracted_x, hotspot_x, "Hotspot X coordinate not preserved");
        prop_assert_eq!(extracted_y, hotspot_y, "Hotspot Y coordinate not preserved");
    }
}

/// Test hotspot preservation with file conversion
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_hotspot_preserved_in_file_conversion(
        size in 32u32..=128u32,
        hotspot_x in 0u16..=127u16,
        hotspot_y in 0u16..=127u16,
    ) {
        // Ensure hotspot is within bounds
        let hotspot_x = hotspot_x.min(size as u16 - 1);
        let hotspot_y = hotspot_y.min(size as u16 - 1);

        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let input_path = temp_dir.path().join("test.png");
        let output_path = temp_dir.path().join("test.cur");

        // Create and save a PNG image
        let image = create_test_image(size, size, 150);
        image.save_with_format(&input_path, ImageFormat::Png)
            .expect("Failed to save PNG");

        // Convert to cursor with specified hotspot
        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            size,
            hotspot_x,
            hotspot_y,
            1.0,
            0,
            0,
        );

        prop_assert!(result.is_ok(), "Conversion failed: {:?}", result.err());

        // Read and extract hotspot from output
        let cur_data = std::fs::read(&output_path).expect("Failed to read output");
        let extracted = extract_hotspot(&cur_data);
        prop_assert!(extracted.is_ok(), "Failed to extract hotspot: {:?}", extracted.err());

        let (extracted_x, extracted_y) = extracted.unwrap();

        // Verify hotspot coordinates are preserved
        prop_assert_eq!(extracted_x, hotspot_x, "Hotspot X not preserved in file conversion");
        prop_assert_eq!(extracted_y, hotspot_y, "Hotspot Y not preserved in file conversion");
    }
}

/// Test hotspot preservation at edge cases (corners and edges)
proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    #[test]
    fn prop_hotspot_preserved_at_edges(
        size in 32u32..=128u32,
        edge_case in 0usize..=8usize,
    ) {
        // Define edge cases: corners, midpoints, and center
        let (hotspot_x, hotspot_y) = match edge_case {
            0 => (0, 0),                                    // Top-left corner
            1 => (size as u16 - 1, 0),                      // Top-right corner
            2 => (0, size as u16 - 1),                      // Bottom-left corner
            3 => (size as u16 - 1, size as u16 - 1),        // Bottom-right corner
            4 => (size as u16 / 2, 0),                      // Top edge center
            5 => (size as u16 / 2, size as u16 - 1),        // Bottom edge center
            6 => (0, size as u16 / 2),                      // Left edge center
            7 => (size as u16 - 1, size as u16 / 2),        // Right edge center
            _ => (size as u16 / 2, size as u16 / 2),        // Center
        };

        let image = create_test_image(size, size, 200);
        let result = generate_cur_data(&image, hotspot_x, hotspot_y);

        prop_assert!(result.is_ok(), "Failed to generate cursor data: {:?}", result.err());

        let cur_data = result.unwrap();
        let extracted = extract_hotspot(&cur_data);
        prop_assert!(extracted.is_ok(), "Failed to extract hotspot: {:?}", extracted.err());

        let (extracted_x, extracted_y) = extracted.unwrap();

        prop_assert_eq!(extracted_x, hotspot_x, "Hotspot X not preserved at edge case {}", edge_case);
        prop_assert_eq!(extracted_y, hotspot_y, "Hotspot Y not preserved at edge case {}", edge_case);
    }
}

/// Helper function to extract image dimensions from .CUR data
fn extract_dimensions(data: &[u8]) -> Result<(u32, u32), String> {
    if data.len() < 22 {
        return Err("CUR file too small to extract dimensions".to_string());
    }

    let width_byte = data[6];
    let height_byte = data[7];

    // 0 means 256 in the CUR format
    let width = if width_byte == 0 {
        256
    } else {
        width_byte as u32
    };
    let height = if height_byte == 0 {
        256
    } else {
        height_byte as u32
    };

    Ok((width, height))
}

/// **Feature: app-quality-improvement, Property 5: Cursor scaling maintains aspect ratio**
///
/// For any valid cursor size dimension, scaling a cursor image should maintain
/// the correct aspect ratio without distortion or artifacts.
///
/// **Validates: Requirements 2.5**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_cursor_scaling_maintains_square_aspect(
        original_size in 32u32..=128u32,
        target_size in 32u32..=256u32,
    ) {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let input_path = temp_dir.path().join("test.png");
        let output_path = temp_dir.path().join("test.cur");

        // Create a square image
        let image = create_test_image(original_size, original_size, 75);
        image.save_with_format(&input_path, ImageFormat::Png)
            .expect("Failed to save PNG");

        // Convert to cursor with target size
        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            target_size,
            0,
            0,
            1.0,
            0,
            0,
        );

        prop_assert!(result.is_ok(), "Conversion failed: {:?}", result.err());

        // Read and validate the output
        let cur_data = std::fs::read(&output_path).expect("Failed to read output");
        let validation = validate_cur_format(&cur_data);
        prop_assert!(validation.is_ok(), "Invalid CUR format: {:?}", validation.err());

        // For square images, aspect ratio is maintained if output is also square
        // The cursor converter should produce square cursors for square inputs
        let dimensions = extract_dimensions(&cur_data);
        prop_assert!(dimensions.is_ok(), "Failed to extract dimensions: {:?}", dimensions.err());

        let (width, height) = dimensions.unwrap();

        // Verify the cursor is square (aspect ratio 1:1)
        prop_assert_eq!(width, height, "Aspect ratio not maintained: {}x{}", width, height);

        // Verify the size matches the target (or is 256 if target was 256+)
        let expected_size = if target_size >= 256 { 256 } else { target_size };
        prop_assert_eq!(width, expected_size, "Width doesn't match target size");
        prop_assert_eq!(height, expected_size, "Height doesn't match target size");
    }
}

/// Test that scaling to various sizes produces valid cursors
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_scaling_to_various_sizes_produces_valid_cursors(
        original_size in 32u32..=128u32,
        size_multiplier in 1u32..=4u32,
    ) {
        let target_size = (original_size * size_multiplier).min(512);

        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let input_path = temp_dir.path().join("test.png");
        let output_path = temp_dir.path().join("test.cur");

        // Create an image
        let image = create_test_image(original_size, original_size, 125);
        image.save_with_format(&input_path, ImageFormat::Png)
            .expect("Failed to save PNG");

        // Convert to cursor with target size
        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            target_size,
            0,
            0,
            1.0,
            0,
            0,
        );

        prop_assert!(result.is_ok(), "Conversion failed for size {}: {:?}", target_size, result.err());

        // Validate the output
        let cur_data = std::fs::read(&output_path).expect("Failed to read output");
        let validation = validate_cur_format(&cur_data);
        prop_assert!(validation.is_ok(), "Invalid CUR format for size {}: {:?}", target_size, validation.err());
    }
}

/// Test scaling with direct image buffer (no file I/O)
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_direct_scaling_maintains_validity(
        width in 16u32..=256u32,
        height in 16u32..=256u32,
    ) {
        // Create an image with potentially non-square dimensions
        let image = create_test_image(width, height, 175);

        // Generate cursor data
        let result = generate_cur_data(&image, 0, 0);

        prop_assert!(result.is_ok(), "Failed to generate cursor for {}x{}: {:?}", width, height, result.err());

        let cur_data = result.unwrap();

        // Validate format
        let validation = validate_cur_format(&cur_data);
        prop_assert!(validation.is_ok(), "Invalid CUR format for {}x{}: {:?}", width, height, validation.err());

        // Extract and verify dimensions
        let dimensions = extract_dimensions(&cur_data);
        prop_assert!(dimensions.is_ok(), "Failed to extract dimensions: {:?}", dimensions.err());

        let (out_width, out_height) = dimensions.unwrap();

        // The output should match the input dimensions (or 256 if input was 256)
        let expected_width = if width >= 256 { 256 } else { width };
        let expected_height = if height >= 256 { 256 } else { height };

        prop_assert_eq!(out_width, expected_width, "Width mismatch");
        prop_assert_eq!(out_height, expected_height, "Height mismatch");
    }
}
