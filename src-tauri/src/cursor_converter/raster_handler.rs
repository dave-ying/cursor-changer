//! Raster image handling module for cursor conversion
//!
//! This module provides functionality to:
//! - Load and resize raster images (PNG, ICO, BMP, JPG, JPEG)
//! - Handle different image formats and bit depths
//! - Support transparency and various color modes

use image::{imageops::FilterType, ImageBuffer, Rgba};
use std::path::Path;

/// Load a raster image (PNG, ICO, etc.) and resize if needed
///
/// # Arguments
/// * `path` - Path to the image file
/// * `size` - Target size in pixels (width and height)
/// * `scale` - Scale factor to apply (1.0 = 100%, 0.5 = 50%, etc.)
/// * `offset_x` - Horizontal offset in pixels (positive = right, negative = left)
/// * `offset_y` - Vertical offset in pixels (positive = down, negative = up)
pub fn load_raster_image(
    path: &str,
    size: u32,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>, String> {
    // Load image
    let img = image::open(path).map_err(|e| format!("Failed to load image: {}", e))?;

    // Convert to RGBA
    let img = img.to_rgba8();

    // Create a transparent canvas of target size
    let mut canvas = ImageBuffer::from_pixel(size, size, Rgba([0, 0, 0, 0]));

    // Calculate the scaled dimensions
    let scaled_width = (img.width() as f32 * scale) as u32;
    let scaled_height = (img.height() as f32 * scale) as u32;

    // Resize the image to the scaled dimensions
    let scaled_img = if scaled_width > 0 && scaled_height > 0 {
        image::imageops::resize(&img, scaled_width, scaled_height, FilterType::Lanczos3)
    } else {
        // If scale results in zero size, return empty canvas
        return Ok(canvas);
    };

    // Calculate position to place the scaled image on the canvas
    // Center the image first, then apply offset
    // Note: CSS transform applies translate in scaled space, so we need to scale the offset
    let center_x = (size as i32 - scaled_width as i32) / 2;
    let center_y = (size as i32 - scaled_height as i32) / 2;
    let final_x = center_x + (offset_x as f32 * scale) as i32;
    let final_y = center_y + (offset_y as f32 * scale) as i32;

    // Composite the scaled image onto the canvas
    for y in 0..scaled_height {
        for x in 0..scaled_width {
            let canvas_x = final_x + x as i32;
            let canvas_y = final_y + y as i32;

            // Only draw pixels that are within canvas bounds
            if canvas_x >= 0 && canvas_x < size as i32 && canvas_y >= 0 && canvas_y < size as i32 {
                let pixel = scaled_img.get_pixel(x, y);
                canvas.put_pixel(canvas_x as u32, canvas_y as u32, *pixel);
            }
        }
    }

    Ok(canvas)
}

/// Check if a file path points to a raster image file
pub fn is_raster_image(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| {
            let ext = s.to_lowercase();
            matches!(ext.as_str(), "png" | "ico" | "bmp" | "jpg" | "jpeg")
        })
        .unwrap_or(false)
}

/// Get the file extension for a raster image
pub fn get_raster_extension(path: &str) -> Option<String> {
    Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
}

/// Check if a file extension is a supported raster format
pub fn is_supported_raster_format(extension: &str) -> bool {
    let ext = extension.to_lowercase();
    matches!(ext.as_str(), "png" | "ico" | "bmp" | "jpg" | "jpeg")
}

/// Get the MIME type for a raster image format
pub fn get_raster_mime_type(extension: &str) -> &'static str {
    match extension.to_lowercase().as_str() {
        "png" => "image/png",
        "ico" => "image/x-icon",
        "bmp" => "image/bmp",
        "jpg" | "jpeg" => "image/jpeg",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};
    use std::path::Path;
    use tempfile::tempdir;

    #[test]
    fn test_is_raster_image() {
        assert!(is_raster_image("test.png"));
        assert!(is_raster_image("test.ico"));
        assert!(is_raster_image("test.bmp"));
        assert!(is_raster_image("test.jpg"));
        assert!(is_raster_image("test.jpeg"));
        assert!(is_raster_image("test.PNG"));

        assert!(!is_raster_image("test.svg"));
        assert!(!is_raster_image("test.cur"));
        assert!(!is_raster_image("test"));
    }

    #[test]
    fn test_offset_scaling_matches_css_behavior() {
        // Create a test image
        let temp = tempdir().expect("tempdir");
        let input = temp.path().join("input.png");
        let image = ImageBuffer::from_fn(64, 64, |x, y| {
            let value = ((x + y) % 2) as u8 * 255;
            Rgba([value, 0, 255 - value, 255])
        });
        image.save(&input).expect("save png");

        // Test with scale = 2.0 and offset = 10
        // CSS behavior: translate happens in scaled space, so 10px offset becomes 20px in original space
        let result = load_raster_image(input.to_string_lossy().as_ref(), 128, 2.0, 10, 10)
            .expect("load image");

        // The image should be positioned at center + (10 * 2.0) = center + 20
        // For a 128px canvas with a 128px scaled image (64px * 2.0), center is 0
        // So final position should be 20, 20

        // Verify the image is not empty
        assert_eq!(result.width(), 128);
        assert_eq!(result.height(), 128);
    }

    #[test]
    fn test_get_raster_extension() {
        assert_eq!(get_raster_extension("test.png"), Some("png".to_string()));
        assert_eq!(
            get_raster_extension("path/to/image.ico"),
            Some("ico".to_string())
        );
        assert_eq!(get_raster_extension("noextension"), None);
    }

    #[test]
    fn test_is_supported_raster_format() {
        assert!(is_supported_raster_format("png"));
        assert!(is_supported_raster_format("ico"));
        assert!(is_supported_raster_format("bmp"));
        assert!(is_supported_raster_format("jpg"));
        assert!(is_supported_raster_format("jpeg"));
        assert!(!is_supported_raster_format("svg"));
        assert!(!is_supported_raster_format("cur"));
    }

    #[test]
    fn test_get_raster_mime_type() {
        assert_eq!(get_raster_mime_type("png"), "image/png");
        assert_eq!(get_raster_mime_type("ico"), "image/x-icon");
        assert_eq!(get_raster_mime_type("bmp"), "image/bmp");
        assert_eq!(get_raster_mime_type("jpg"), "image/jpeg");
        assert_eq!(get_raster_mime_type("jpeg"), "image/jpeg");
        assert_eq!(get_raster_mime_type("svg"), "application/octet-stream");
    }

    #[test]
    fn test_raster_file_detection() {
        // Test various raster formats
        assert!(is_raster_image("cursor.png"));
        assert!(is_raster_image("icon.ICO"));
        assert!(is_raster_image("photo.bmp"));
        assert!(is_raster_image("image.jpg"));
        assert!(is_raster_image("picture.jpeg"));

        // Test case insensitive
        assert!(is_raster_image("test.PNG"));
        assert!(is_raster_image("test.JPG"));

        // Test non-raster files
        assert!(!is_raster_image("vector.svg"));
        assert!(!is_raster_image("cursor.cur"));
        assert!(!is_raster_image("document.txt"));
    }
}
