//! Cursor converter module - converts images to Windows .CUR cursor format
//!
//! This module provides functionality to:
//! - Convert various image formats (SVG, PNG, ICO, BMP, JPG) to Windows .CUR cursor format
//! - Handle SVG parsing and rendering with robust error handling
//! - Support raster image loading and high-quality resizing (Lanczos3)
//! - Generate proper .CUR file format with hotspot coordinates
//!
//! # Quality Settings
//!
//! - Maximum resolution: 256x256 (Windows .CUR format limit)
//! - Color depth: 32-bit RGBA (8-bit per channel with full alpha)
//! - Format: PNG embedded in .CUR (lossless compression)
//! - Resize filter: Lanczos3 (highest quality resampling)

pub mod binary_writer;
pub mod cur_generator;
pub mod raster_handler;
pub mod svg_handler;

#[cfg(test)]
mod property_tests;

// Re-export public API for backward compatibility
pub use cur_generator::{generate_cur_data, validate_cursor_dimensions, MAX_CURSOR_SIZE};
pub use raster_handler::load_raster_image;
pub use svg_handler::{load_svg, render_svg_to_png_bytes};
// Internal helpers from binary_writer are intentionally kept private to avoid unused export warnings

/// Convert an image file (SVG, PNG, ICO, BMP, JPG) to a .CUR file
///
/// # Arguments
/// * `input_path` - Path to the input image file
/// * `output_path` - Path where the .CUR file will be saved
/// * `size` - Target size in pixels (width and height, max 256)
/// * `click_point_x` - Click point X coordinate (hotspot, default 0)
/// * `click_point_y` - Click point Y coordinate (hotspot, default 0)
/// * `scale` - Scale factor to apply (1.0 = 100%, 0.5 = 50%, etc.)
/// * `offset_x` - Horizontal offset in pixels (positive = right, negative = left)
/// * `offset_y` - Vertical offset in pixels (positive = down, negative = up)
///
/// # Quality
/// - Uses Lanczos3 resampling for highest quality resizing
/// - Outputs PNG-embedded .CUR for lossless 32-bit RGBA
///
/// # Returns
/// `Ok(())` on success, or an error message
pub fn convert_to_cur(
    input_path: &str,
    output_path: &str,
    size: u32,
    hotspot_x: u16,
    hotspot_y: u16,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<(), String> {
    // Clamp size to maximum allowed (256x256 is Windows .CUR limit)
    let size = size.min(cur_generator::MAX_CURSOR_SIZE);

    // Determine file type from extension
    let extension = std::path::Path::new(input_path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .ok_or_else(|| "File has no extension".to_string())?;

    // Load or render image based on file type
    let image = match extension.as_str() {
        "svg" => load_svg(input_path, size, scale, offset_x, offset_y)?,
        "png" | "ico" | "bmp" | "jpg" | "jpeg" => {
            load_raster_image(input_path, size, scale, offset_x, offset_y)?
        }
        _ => return Err(format!("Unsupported file type: {}", extension)),
    };

    // Generate .CUR file data (PNG-embedded for maximum quality)
    let cur_data = generate_cur_data(&image, hotspot_x, hotspot_y)?;

    // Write to file
    std::fs::write(output_path, cur_data)
        .map_err(|e| format!("Failed to write .CUR file: {}", e))?;

    Ok(())
}

/// Render an SVG file to PNG bytes using the same rendering pipeline as cursor conversion
///
/// This is already re-exported above for backward compatibility

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, ImageFormat, Rgba};

    #[test]
    fn test_write_helpers() {
        let mut data = Vec::new();
        binary_writer::write_u16(&mut data, 0x1234).unwrap();
        assert_eq!(data, vec![0x34, 0x12]);

        let mut data = Vec::new();
        binary_writer::write_u32(&mut data, 0x12345678).unwrap();
        assert_eq!(data, vec![0x78, 0x56, 0x34, 0x12]);
    }

    #[test]
    fn generate_cur_data_contains_click_point_coordinates() {
        let image = ImageBuffer::from_pixel(32, 32, Rgba([255, 0, 0, 255]));
        let data = generate_cur_data(&image, 7, 9).expect("generate");

        assert_eq!(&data[0..4], &[0, 0, 2, 0]);
        assert_eq!(u16::from_le_bytes([data[10], data[11]]), 7);
        assert_eq!(u16::from_le_bytes([data[12], data[13]]), 9);
    }

    #[test]
    fn generate_cur_data_always_uses_png() {
        // All sizes now use PNG embedding for maximum quality
        let image = ImageBuffer::from_pixel(32, 32, Rgba([255, 0, 0, 255]));
        let data = generate_cur_data(&image, 0, 0).expect("generate");

        // PNG signature at offset 22 (after ICONDIR + ICONDIRENTRY)
        let offset = 6 + 16;
        assert_eq!(
            &data[offset..offset + 8],
            &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]
        );
    }

    #[test]
    fn convert_to_cur_from_png_creates_file() {
        let temp = tempfile::tempdir().expect("tempdir");
        let input = temp.path().join("input.png");
        let output = temp.path().join("out.cur");

        let image = ImageBuffer::from_fn(8, 8, |x, y| {
            let value = ((x + y) % 2) as u8 * 255;
            Rgba([value, 0, 255 - value, 255])
        });
        image
            .save_with_format(&input, ImageFormat::Png)
            .expect("save png");

        convert_to_cur(
            input.to_string_lossy().as_ref(),
            output.to_string_lossy().as_ref(),
            256,
            0,
            0,
            1.0,
            0,
            0,
        )
        .expect("convert png");

        let metadata = std::fs::metadata(&output).expect("metadata");
        assert!(metadata.len() > 0);
    }

    #[test]
    fn convert_to_cur_from_svg_creates_file() {
        let temp = tempfile::tempdir().expect("tempdir");
        let input = temp.path().join("input.svg");
        let output = temp.path().join("out.cur");

        let svg = r#"<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='16' height='16' fill='blue'/></svg>"#;
        std::fs::write(&input, svg).expect("write svg");

        convert_to_cur(
            input.to_string_lossy().as_ref(),
            output.to_string_lossy().as_ref(),
            MAX_CURSOR_SIZE,
            2,
            3,
            1.0,
            0,
            0,
        )
        .expect("convert svg");

        let metadata = std::fs::metadata(&output).expect("metadata");
        assert!(metadata.len() > 0);
    }

    #[test]
    fn convert_to_cur_clamps_size_to_max() {
        let temp = tempfile::tempdir().expect("tempdir");
        let input = temp.path().join("input.png");
        let output = temp.path().join("out.cur");

        let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
            ImageBuffer::from_pixel(64, 64, Rgba([255u8, 0, 0, 255]));
        image
            .save_with_format(&input, ImageFormat::Png)
            .expect("save png");

        // Request oversize, should be clamped to MAX_CURSOR_SIZE
        let oversize = MAX_CURSOR_SIZE + 1;
        convert_to_cur(
            input.to_string_lossy().as_ref(),
            output.to_string_lossy().as_ref(),
            oversize,
            0,
            0,
            1.0,
            0,
            0,
        )
        .expect("convert with oversized request");

        let metadata = std::fs::metadata(&output).expect("metadata");
        assert!(metadata.len() > 0);
    }

    #[test]
    fn generate_cur_data_256_is_png() {
        // MAX_CURSOR_SIZE x MAX_CURSOR_SIZE is the maximum size
        let image =
            ImageBuffer::from_pixel(MAX_CURSOR_SIZE, MAX_CURSOR_SIZE, Rgba([10, 20, 30, 255]));
        let data = generate_cur_data(&image, 5, 7).expect("generate");

        // ICONDIR header should be present
        assert_eq!(&data[0..4], &[0, 0, 2, 0]);

        // Image data should start at offset 6 + 16 = 22
        let offset = 6 + 16;
        assert!(data.len() >= offset + 8);

        // PNG signature at the start of the image blob
        assert_eq!(
            &data[offset..offset + 8],
            &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]
        );

        // Click point coordinates preserved in ICONDIRENTRY
        assert_eq!(u16::from_le_bytes([data[10], data[11]]), 5);
        assert_eq!(u16::from_le_bytes([data[12], data[13]]), 7);
    }
}
