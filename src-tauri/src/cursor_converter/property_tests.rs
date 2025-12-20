//! Property-based tests for cursor conversion
//!
//! These tests validate correctness properties across randomly generated inputs
//! to discover edge cases and ensure robust behavior.

#[cfg(test)]
mod tests {
    use crate::cursor_converter::{convert_to_cur, generate_cur_data};
    use image::{ImageBuffer, ImageFormat, Rgba};
    use proptest::prelude::*;
    use std::io::Cursor;

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
}
