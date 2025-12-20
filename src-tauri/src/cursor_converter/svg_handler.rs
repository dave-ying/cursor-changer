//! SVG handling module for cursor conversion
//!
//! This module provides functionality to:
//! - Load and parse SVG files with robust error handling
//! - Render SVG to bitmap with proper scaling and positioning
//! - Handle various SVG edge cases and malformed content

use image::{ImageBuffer, ImageEncoder, Rgba};
use std::path::Path;

/// Load and render an SVG file to a bitmap
///
/// # Arguments
/// * `path` - Path to the SVG file
/// * `size` - Target size in pixels (width and height)
/// * `scale` - Additional scale factor to apply (1.0 = 100%, 0.5 = 50%, etc.)
/// * `offset_x` - Horizontal offset in pixels (positive = right, negative = left)
/// * `offset_y` - Vertical offset in pixels (positive = down, negative = up)
pub fn load_svg(
    path: &str,
    size: u32,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>, String> {
    // Read SVG file
    let svg_data = std::fs::read(path).map_err(|e| format!("Failed to read SVG file: {}", e))?;

    if svg_data.is_empty() {
        return Err("SVG file is empty".to_string());
    }

    // Try to parse the SVG; if parsing fails, attempt a few safe fallbacks
    let opts = usvg::Options::default();

    // Primary attempt: parse the raw bytes as provided
    let tree = match usvg::Tree::from_data(&svg_data, &opts) {
        Ok(t) => t,
        Err(e1) => {
            // 1) Try stripping a UTF-8 BOM if present
            if svg_data.starts_with(&[0xEF, 0xBB, 0xBF]) {
                if let Ok(t) = usvg::Tree::from_data(&svg_data[3..], &opts) {
                    t
                } else {
                    // 2) Try to salvage by locating the first "<svg" and parsing from there
                    let text = String::from_utf8_lossy(&svg_data);
                    if let Some(pos) = text.find("<svg") {
                        let suffix = &text[pos..];
                        if let Ok(t) = usvg::Tree::from_data(suffix.as_bytes(), &opts) {
                            t
                        } else {
                            let preview = if text.len() > 200 {
                                &text[..200]
                            } else {
                                &text
                            };
                            return Err(format!(
                                "Failed to parse SVG: {}. File size: {} bytes. Preview: {}",
                                e1,
                                svg_data.len(),
                                preview
                            ));
                        }
                    } else {
                        let first_bytes = &svg_data[..std::cmp::min(64, svg_data.len())];
                        return Err(format!(
                            "Failed to parse SVG: {}. File size: {} bytes. First bytes: {:?}",
                            e1,
                            svg_data.len(),
                            first_bytes
                        ));
                    }
                }
            } else {
                // No BOM: try to find an <svg start and parse from there
                let text = String::from_utf8_lossy(&svg_data);
                if let Some(pos) = text.find("<svg") {
                    let suffix = &text[pos..];
                    if let Ok(t) = usvg::Tree::from_data(suffix.as_bytes(), &opts) {
                        t
                    } else {
                        let preview = if text.len() > 200 {
                            &text[..200]
                        } else {
                            &text
                        };
                        return Err(format!(
                            "Failed to parse SVG: {}. File size: {} bytes. Preview: {}",
                            e1,
                            svg_data.len(),
                            preview
                        ));
                    }
                } else {
                    let first_bytes = &svg_data[..std::cmp::min(64, svg_data.len())];
                    return Err(format!(
                        "Failed to parse SVG: {}. File size: {} bytes. First bytes: {:?}",
                        e1,
                        svg_data.len(),
                        first_bytes
                    ));
                }
            }
        }
    };

    // Create pixmap for rendering
    let mut pixmap =
        tiny_skia::Pixmap::new(size, size).ok_or_else(|| "Failed to create pixmap".to_string())?;

    // Calculate scale to fit SVG in target size while maintaining aspect ratio
    // This replicates CSS "object-fit: contain" behavior
    let svg_size = tree.size();
    // Guard against zero dimensions which would cause division by zero
    let svg_w = if svg_size.width() == 0.0 {
        1.0
    } else {
        svg_size.width()
    };
    let svg_h = if svg_size.height() == 0.0 {
        1.0
    } else {
        svg_size.height()
    };

    let scale_x = size as f32 / svg_w;
    let scale_y = size as f32 / svg_h;
    let fit_scale = scale_x.min(scale_y);

    // Apply user-specified scale on top of fit scale
    let final_scale = fit_scale * scale;

    // Calculate the final rendered size after all scaling
    let final_width = svg_w * final_scale;
    let final_height = svg_h * final_scale;

    // Center the scaled SVG in the canvas (transform-origin: center behavior)
    let base_offset_x = (size as f32 - final_width) / 2.0;
    let base_offset_y = (size as f32 - final_height) / 2.0;

    // Apply user-specified offset (offset is in pre-scale space, so multiply by scale)
    // CSS: transform: scale(s) translate(ox, oy) means translate happens in scaled space
    let final_offset_x = base_offset_x + (offset_x as f32 * scale);
    let final_offset_y = base_offset_y + (offset_y as f32 * scale);

    let transform = tiny_skia::Transform::from_translate(final_offset_x, final_offset_y)
        .post_scale(final_scale, final_scale);

    // Render SVG
    resvg::render(&tree, transform, &mut pixmap.as_mut());

    // Convert pixmap to ImageBuffer
    let raw_data = pixmap.take();
    ImageBuffer::from_raw(size, size, raw_data)
        .ok_or_else(|| "Failed to create image buffer from pixmap".to_string())
}

/// Render an SVG file to PNG bytes using the same rendering pipeline as cursor conversion
pub fn render_svg_to_png_bytes(path: &str, size: u32) -> Result<Vec<u8>, String> {
    // Use default transformations (no scale/offset)
    let image = load_svg(path, size, 1.0, 0, 0)?;
    let mut png_data = Vec::new();
    let width = image.width();
    let height = image.height();

    let encoder = image::codecs::png::PngEncoder::new(&mut png_data);
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

/// Check if a file path points to an SVG file
pub fn is_svg_file(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase() == "svg")
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_svg_file() {
        assert!(is_svg_file("test.svg"));
        assert!(is_svg_file("test.SVG"));
        assert!(is_svg_file("C:\\path\\to\\file.SVG"));
        assert!(!is_svg_file("test.png"));
        assert!(!is_svg_file("test"));
    }

    #[test]
    fn test_svg_file_detection_with_various_extensions() {
        // Test various SVG extensions
        assert!(is_svg_file("cursor.svg"));
        assert!(is_svg_file("icon.SVG"));
        assert!(is_svg_file("image.SvG"));

        // Test non-SVG files
        assert!(!is_svg_file("image.png"));
        assert!(!is_svg_file("photo.jpg"));
        assert!(!is_svg_file("icon.ico"));
        assert!(!is_svg_file("noextension"));
    }
}
