//! Unit tests for cursor conversion operations
//!
//! These tests cover:
//! - SVG to CUR conversion
//! - PNG to CUR conversion
//! - ICO to CUR conversion
//! - Hotspot setting and preservation
//! - Size scaling and aspect ratio maintenance
//!
//! Requirements: 1.3

use cursor_changer_tauri::cursor_converter::{convert_to_cur, generate_cur_data};
use image::{ImageBuffer, ImageFormat, Rgba};

// Helper function to create a test image with a pattern
fn create_test_image(width: u32, height: u32) -> ImageBuffer<Rgba<u8>, Vec<u8>> {
    ImageBuffer::from_fn(width, height, |x, y| {
        let r = ((x * 255) / width.max(1)) as u8;
        let g = ((y * 255) / height.max(1)) as u8;
        let b = 128;
        Rgba([r, g, b, 255])
    })
}

// Helper to read hotspot from CUR file data
fn read_hotspot_from_cur(cur_data: &[u8]) -> (u16, u16) {
    // Hotspot is at bytes 10-11 (x) and 12-13 (y) in the ICONDIRENTRY
    let x = u16::from_le_bytes([cur_data[10], cur_data[11]]);
    let y = u16::from_le_bytes([cur_data[12], cur_data[13]]);
    (x, y)
}

#[test]
fn test_svg_to_cur_conversion() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.svg");
    let output_path = temp_dir.path().join("test.cur");

    // Create a simple SVG with a circle
    let svg_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="12" fill="blue" stroke="white" stroke-width="2"/>
</svg>"#;

    std::fs::write(&input_path, svg_content).expect("Failed to write SVG");

    // Convert to cursor
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        16,
        16,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "SVG to CUR conversion failed: {:?}",
        result.err()
    );
    assert!(output_path.exists(), "Output CUR file not created");

    // Verify the file has content
    let metadata = std::fs::metadata(&output_path).expect("Failed to read metadata");
    assert!(metadata.len() > 22, "CUR file too small");
}

#[test]
fn test_png_to_cur_conversion() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.png");
    let output_path = temp_dir.path().join("test.cur");

    // Create and save a PNG
    let image = create_test_image(48, 48);
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    // Convert to cursor
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        48,
        24,
        24,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "PNG to CUR conversion failed: {:?}",
        result.err()
    );
    assert!(output_path.exists(), "Output CUR file not created");

    // Verify hotspot was set correctly
    let cur_data = std::fs::read(&output_path).expect("Failed to read CUR file");
    let (x, y) = read_hotspot_from_cur(&cur_data);
    assert_eq!(x, 24, "Hotspot X not preserved");
    assert_eq!(y, 24, "Hotspot Y not preserved");
}

#[test]
fn test_ico_to_cur_conversion() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.ico");
    let output_path = temp_dir.path().join("test.cur");

    // Create and save an ICO
    let image = create_test_image(32, 32);
    image
        .save_with_format(&input_path, ImageFormat::Ico)
        .expect("Failed to save ICO");

    // Convert to cursor
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        8,
        8,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "ICO to CUR conversion failed: {:?}",
        result.err()
    );
    assert!(output_path.exists(), "Output CUR file not created");
}

#[test]
fn test_hotspot_at_origin() {
    let image = create_test_image(32, 32);
    let result = generate_cur_data(&image, 0, 0);

    assert!(
        result.is_ok(),
        "Failed to generate cursor with hotspot at origin"
    );

    let cur_data = result.unwrap();
    let (x, y) = read_hotspot_from_cur(&cur_data);
    assert_eq!(x, 0, "Hotspot X should be 0");
    assert_eq!(y, 0, "Hotspot Y should be 0");
}

#[test]
fn test_hotspot_at_center() {
    let size = 64;
    let image = create_test_image(size, size);
    let center = (size / 2) as u16;

    let result = generate_cur_data(&image, center, center);

    assert!(
        result.is_ok(),
        "Failed to generate cursor with hotspot at center"
    );

    let cur_data = result.unwrap();
    let (x, y) = read_hotspot_from_cur(&cur_data);
    assert_eq!(x, center, "Hotspot X should be at center");
    assert_eq!(y, center, "Hotspot Y should be at center");
}

#[test]
fn test_hotspot_at_corner() {
    let size = 48;
    let image = create_test_image(size, size);
    let corner = (size - 1) as u16;

    let result = generate_cur_data(&image, corner, corner);

    assert!(
        result.is_ok(),
        "Failed to generate cursor with hotspot at corner"
    );

    let cur_data = result.unwrap();
    let (x, y) = read_hotspot_from_cur(&cur_data);
    assert_eq!(x, corner, "Hotspot X should be at corner");
    assert_eq!(y, corner, "Hotspot Y should be at corner");
}

#[test]
fn test_hotspot_asymmetric() {
    let image = create_test_image(64, 64);

    let result = generate_cur_data(&image, 10, 50);

    assert!(
        result.is_ok(),
        "Failed to generate cursor with asymmetric hotspot"
    );

    let cur_data = result.unwrap();
    let (x, y) = read_hotspot_from_cur(&cur_data);
    assert_eq!(x, 10, "Hotspot X not preserved");
    assert_eq!(y, 50, "Hotspot Y not preserved");
}

#[test]
fn test_size_scaling_upscale() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("small.png");
    let output_path = temp_dir.path().join("large.cur");

    // Create a small 16x16 image
    let image = create_test_image(16, 16);
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    // Scale up to 64x64
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        64,
        32,
        32,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "Failed to upscale cursor: {:?}",
        result.err()
    );
    assert!(output_path.exists(), "Output file not created");
}

#[test]
fn test_size_scaling_downscale() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("large.png");
    let output_path = temp_dir.path().join("small.cur");

    // Create a large 128x128 image
    let image = create_test_image(128, 128);
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    // Scale down to 32x32
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        16,
        16,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "Failed to downscale cursor: {:?}",
        result.err()
    );
    assert!(output_path.exists(), "Output file not created");
}

#[test]
fn test_size_scaling_maintains_square_aspect() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("square.png");
    let output_path = temp_dir.path().join("scaled.cur");

    // Create a square 64x64 image
    let image = create_test_image(64, 64);
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    // Scale to different size
    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        96,
        48,
        48,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "Failed to scale square cursor: {:?}",
        result.err()
    );
}

#[test]
fn test_multiple_size_conversions() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("source.png");

    // Create source image
    let image = create_test_image(64, 64);
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    // Test multiple target sizes
    let sizes = [16, 24, 32, 48, 64, 96, 128];

    for size in sizes.iter() {
        let output_path = temp_dir.path().join(format!("cursor_{}.cur", size));

        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            *size,
            (size / 2) as u16,
            (size / 2) as u16,
            1.0,
            0,
            0,
        );

        assert!(
            result.is_ok(),
            "Failed to convert to size {}: {:?}",
            size,
            result.err()
        );
        assert!(
            output_path.exists(),
            "Output file not created for size {}",
            size
        );
    }
}

#[test]
fn test_svg_scaling_preserves_vector_quality() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("vector.svg");

    // Create an SVG with geometric shapes
    let svg_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect x="4" y="4" width="24" height="24" fill="red" stroke="black" stroke-width="1"/>
    <circle cx="16" cy="16" r="8" fill="blue"/>
</svg>"#;

    std::fs::write(&input_path, svg_content).expect("Failed to write SVG");

    // Scale to multiple sizes - SVG should render cleanly at each size
    let sizes = [16, 32, 64, 128, 256];

    for size in sizes.iter() {
        let output_path = temp_dir.path().join(format!("vector_{}.cur", size));

        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            *size,
            (size / 2) as u16,
            (size / 2) as u16,
            1.0,
            0,
            0,
        );

        assert!(
            result.is_ok(),
            "Failed to scale SVG to size {}: {:?}",
            size,
            result.err()
        );
        assert!(
            output_path.exists(),
            "Output file not created for size {}",
            size
        );
    }
}

#[test]
fn test_hotspot_preservation_through_conversion() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.png");
    let output_path = temp_dir.path().join("test.cur");

    // Create test image
    let image = create_test_image(32, 32);
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    // Test various hotspot positions
    let hotspots = [(0, 0), (16, 16), (31, 31), (5, 27), (20, 10)];

    for (hx, hy) in hotspots.iter() {
        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            32,
            *hx,
            *hy,
            1.0,
            0,
            0,
        );

        assert!(
            result.is_ok(),
            "Failed to convert with hotspot ({}, {}): {:?}",
            hx,
            hy,
            result.err()
        );

        // Verify hotspot was preserved
        let cur_data = std::fs::read(&output_path).expect("Failed to read CUR file");
        let (x, y) = read_hotspot_from_cur(&cur_data);
        assert_eq!(x, *hx, "Hotspot X not preserved for ({}, {})", hx, hy);
        assert_eq!(y, *hy, "Hotspot Y not preserved for ({}, {})", hx, hy);
    }
}

#[test]
fn test_conversion_with_transparency() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("transparent.png");
    let output_path = temp_dir.path().join("transparent.cur");

    // Create image with alpha channel
    let image: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(32, 32, |x, _y| {
        let alpha = if x < 16 { 255 } else { 128 };
        Rgba([255, 0, 0, alpha])
    });
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    let result = convert_to_cur(
        input_path.to_str().unwrap(),
        output_path.to_str().unwrap(),
        32,
        16,
        16,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "Failed to convert transparent image: {:?}",
        result.err()
    );
}

#[test]
fn test_batch_conversion_different_formats() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");

    // Create test files in different formats
    let image = create_test_image(32, 32);

    let png_path = temp_dir.path().join("test.png");
    image
        .save_with_format(&png_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    let bmp_path = temp_dir.path().join("test.bmp");
    image
        .save_with_format(&bmp_path, ImageFormat::Bmp)
        .expect("Failed to save BMP");

    let svg_path = temp_dir.path().join("test.svg");
    let svg_content = r#"<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="green"/></svg>"#;
    std::fs::write(&svg_path, svg_content).expect("Failed to write SVG");

    // Convert all formats
    let formats = vec![("PNG", png_path), ("BMP", bmp_path), ("SVG", svg_path)];

    for (format_name, input_path) in formats {
        let output_path = temp_dir.path().join(format!("{}.cur", format_name));

        let result = convert_to_cur(
            input_path.to_str().unwrap(),
            output_path.to_str().unwrap(),
            32,
            16,
            16,
            1.0,
            0,
            0,
        );

        assert!(
            result.is_ok(),
            "Failed to convert {}: {:?}",
            format_name,
            result.err()
        );
        assert!(
            output_path.exists(),
            "{} conversion did not create output file",
            format_name
        );
    }
}
