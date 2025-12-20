//! .CUR file generation module for cursor conversion
//!
//! This module provides functionality to:
//! - Generate proper .CUR file format with hotspot coordinates
//! - Use PNG embedded format for maximum quality (32-bit RGBA, lossless)
//! - Generate cursor headers and directory entries correctly
//!
//! Quality notes:
//! - Maximum practical cursor size is 256x256 (Windows .CUR format limit)
//! - All cursors use embedded PNG format for lossless RGBA8 quality
//! - 32-bit color depth with full 8-bit alpha channel

use super::binary_writer::{write_u16, write_u32};
use image::{codecs::png::PngEncoder, ImageBuffer, ImageEncoder, Rgba};

/// Maximum cursor dimension (Windows .CUR format limit)
pub const MAX_CURSOR_SIZE: u32 = 256;

/// Generate .CUR file data from an RGBA image
///
/// Always uses PNG embedding for maximum quality (lossless RGBA8).
///
/// .CUR file format:
/// - ICONDIR header (6 bytes)
/// - ICONDIRENTRY (16 bytes)
/// - PNG image data (lossless compression)
pub fn generate_cur_data(
    image: &ImageBuffer<Rgba<u8>, Vec<u8>>,
    click_point_x: u16,
    click_point_y: u16,
) -> Result<Vec<u8>, String> {
    let width = image.width();
    let height = image.height();

    let max_click_point_x = width.saturating_sub(1) as u16;
    let max_click_point_y = height.saturating_sub(1) as u16;
    let click_point_x = click_point_x.min(max_click_point_x);
    let click_point_y = click_point_y.min(max_click_point_y);

    if width > MAX_CURSOR_SIZE || height > MAX_CURSOR_SIZE {
        return Err(format!(
            "Image dimensions must be {}x{} or smaller",
            MAX_CURSOR_SIZE, MAX_CURSOR_SIZE
        ));
    }

    let mut data = Vec::new();

    // Write ICONDIR header
    write_u16(&mut data, 0)?; // Reserved (must be 0)
    write_u16(&mut data, 2)?; // Type (2 = cursor)
    write_u16(&mut data, 1)?; // Number of images

    // Always use PNG embedding for maximum quality:
    // - Lossless compression preserves all pixel data
    // - Full 32-bit RGBA with 8-bit alpha channel
    // - Better file size than uncompressed DIB for most images
    let image_data_offset = 6 + 16; // After header and directory entry

    // Encode the image to PNG bytes (RGBA8, maximum quality)
    let png_bytes = encode_image_to_png_bytes(image)?;
    let png_len = png_bytes.len() as u32;

    // Write ICONDIRENTRY
    // Note: For dimension 256, we use 0 in the byte field (which means 256 in the spec)
    data.push(if width == MAX_CURSOR_SIZE {
        0
    } else {
        width as u8
    }); // Width
    data.push(if height == MAX_CURSOR_SIZE {
        0
    } else {
        height as u8
    }); // Height
    data.push(0); // Color count (0 for truecolor)
    data.push(0); // Reserved
    write_u16(&mut data, click_point_x)?; // Click point X (hotspot)
    write_u16(&mut data, click_point_y)?; // Click point Y (hotspot)
    write_u32(&mut data, png_len)?; // Size of PNG data
    write_u32(&mut data, image_data_offset as u32)?; // Offset to PNG data

    // Append PNG bytes
    data.extend_from_slice(&png_bytes);

    Ok(data)
}

/// Encode an RGBA ImageBuffer to PNG bytes with maximum quality settings
///
/// Uses:
/// - RGBA8 color type (32-bit with full alpha)
/// - Best compression level for smallest file size without quality loss
/// - PNG is lossless, so no quality degradation occurs
fn encode_image_to_png_bytes(image: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> Result<Vec<u8>, String> {
    use image::codecs::png::CompressionType;
    use image::codecs::png::FilterType;

    let mut png_data = Vec::new();
    let width = image.width();
    let height = image.height();

    // Use best compression (smaller file, same quality since PNG is lossless)
    let encoder =
        PngEncoder::new_with_quality(&mut png_data, CompressionType::Best, FilterType::Adaptive);
    encoder
        .write_image(
            image.as_raw(),
            width,
            height,
            image::ColorType::Rgba8.into(),
        )
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    Ok(png_data)
}

/// Validate cursor dimensions (max 256x256 for Windows .CUR format)
pub fn validate_cursor_dimensions(width: u32, height: u32) -> Result<(), String> {
    if width > MAX_CURSOR_SIZE || height > MAX_CURSOR_SIZE {
        Err(format!(
            "Image dimensions must be {}x{} or smaller",
            MAX_CURSOR_SIZE, MAX_CURSOR_SIZE
        ))
    } else {
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_cur_data_contains_click_point_coordinates() {
        let image = ImageBuffer::from_pixel(32, 32, Rgba([255, 0, 0, 255]));
        let data = generate_cur_data(&image, 7, 9).expect("generate");

        // ICONDIR header: reserved(0), type(2), count(1)
        assert_eq!(&data[0..4], &[0, 0, 2, 0]);
        // Click point coordinates in ICONDIRENTRY
        assert_eq!(u16::from_le_bytes([data[10], data[11]]), 7);
        assert_eq!(u16::from_le_bytes([data[12], data[13]]), 9);
    }

    #[test]
    fn test_generate_cur_data_uses_png_format() {
        // All sizes now use PNG for maximum quality
        let image = ImageBuffer::from_pixel(64, 64, Rgba([10, 20, 30, 255]));
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

    #[test]
    fn test_generate_cur_data_256_is_png() {
        // 256x256 is the maximum size
        let image =
            ImageBuffer::from_pixel(MAX_CURSOR_SIZE, MAX_CURSOR_SIZE, Rgba([10, 20, 30, 255]));
        let data = generate_cur_data(&image, 5, 7).expect("generate");

        // ICONDIR header should be present
        assert_eq!(&data[0..4], &[0, 0, 2, 0]);

        // Width/height bytes should be 0 (meaning 256)
        assert_eq!(data[6], 0); // Width = 256
        assert_eq!(data[7], 0); // Height = 256

        // Image data should start at offset 6 + 16 = 22
        let offset = 6 + 16;
        assert!(data.len() >= offset + 8);

        // PNG signature at the start of the image blob
        assert_eq!(
            &data[offset..offset + 8],
            &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]
        );
    }

    #[test]
    fn test_validate_cursor_dimensions() {
        assert!(validate_cursor_dimensions(32, 32).is_ok());
        assert!(validate_cursor_dimensions(128, 128).is_ok());
        assert!(validate_cursor_dimensions(MAX_CURSOR_SIZE, MAX_CURSOR_SIZE).is_ok());

        // 256 is the max
        assert!(validate_cursor_dimensions(MAX_CURSOR_SIZE + 1, MAX_CURSOR_SIZE).is_err());
        assert!(validate_cursor_dimensions(MAX_CURSOR_SIZE, MAX_CURSOR_SIZE + 1).is_err());
        assert!(validate_cursor_dimensions(MAX_CURSOR_SIZE + 256, MAX_CURSOR_SIZE + 256).is_err());
    }

    #[test]
    fn test_max_cursor_size_constant() {
        assert_eq!(MAX_CURSOR_SIZE, 256);
    }
}
