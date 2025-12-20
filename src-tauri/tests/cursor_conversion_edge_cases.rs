//! Unit tests for cursor conversion edge cases
//!
//! These tests cover specific edge cases including:
//! - Maximum and minimum cursor sizes
//! - Various image formats
//! - Corrupted image handling

use cursor_changer_tauri::cursor_converter::{convert_to_cur, generate_cur_data};
use image::{ImageBuffer, ImageFormat, Rgba};

// Helper function to create a test image
fn create_test_image(width: u32, height: u32) -> ImageBuffer<Rgba<u8>, Vec<u8>> {
    ImageBuffer::from_fn(width, height, |x, y| {
        let r = ((x * 255) / width) as u8;
        let g = ((y * 255) / height) as u8;
        let b = 128;
        Rgba([r, g, b, 255])
    })
}

#[test]
fn test_minimum_cursor_size() {
    // Test with 16x16 (common minimum cursor size)
    let image = create_test_image(16, 16);
    let result = generate_cur_data(&image, 0, 0);
    assert!(
        result.is_ok(),
        "Failed to generate 16x16 cursor: {:?}",
        result.err()
    );

    let cur_data = result.unwrap();
    assert!(cur_data.len() > 22, "CUR data too small");

    // Verify header
    assert_eq!(&cur_data[0..4], &[0, 0, 2, 0], "Invalid header");
}

#[test]
fn test_maximum_cursor_size() {
    // Test with 256x256 (maximum supported size for Windows .CUR)
    let image = create_test_image(256, 256);
    let result = generate_cur_data(&image, 0, 0);
    assert!(
        result.is_ok(),
        "Failed to generate 256x256 cursor: {:?}",
        result.err()
    );

    let cur_data = result.unwrap();
    assert!(cur_data.len() > 22, "CUR data too small");
}

#[test]
fn test_oversized_cursor_rejected() {
    // Test with 257x257 (exceeds maximum)
    let image = create_test_image(257, 257);
    let result = generate_cur_data(&image, 0, 0);
    assert!(result.is_err(), "Should reject oversized cursor");

    let error = result.unwrap_err();
    assert!(
        error.contains("256"),
        "Error should mention size limit: {}",
        error
    );
}

#[test]
fn test_common_cursor_sizes() {
    // Test common cursor sizes: 16, 24, 32, 48, 64, 96, 128, 256
    let sizes = [16, 24, 32, 48, 64, 96, 128, 256];

    for size in sizes.iter() {
        let image = create_test_image(*size, *size);
        let result = generate_cur_data(&image, 0, 0);
        assert!(
            result.is_ok(),
            "Failed to generate {}x{} cursor: {:?}",
            size,
            size,
            result.err()
        );
    }
}

#[test]
fn test_png_format_conversion() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.png");
    let output_path = temp_dir.path().join("test.cur");

    // Create and save a PNG
    let image = create_test_image(32, 32);
    image
        .save_with_format(&input_path, ImageFormat::Png)
        .expect("Failed to save PNG");

    // Convert to cursor
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

    assert!(result.is_ok(), "PNG conversion failed: {:?}", result.err());
    assert!(output_path.exists(), "Output file not created");
}

#[test]
fn test_bmp_format_conversion() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.bmp");
    let output_path = temp_dir.path().join("test.cur");

    // Create and save a BMP
    let image = create_test_image(32, 32);
    image
        .save_with_format(&input_path, ImageFormat::Bmp)
        .expect("Failed to save BMP");

    // Convert to cursor
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

    assert!(result.is_ok(), "BMP conversion failed: {:?}", result.err());
    assert!(output_path.exists(), "Output file not created");
}

#[test]
fn test_ico_format_conversion() {
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
        0,
        0,
        1.0,
        0,
        0,
    );

    assert!(result.is_ok(), "ICO conversion failed: {:?}", result.err());
    assert!(output_path.exists(), "Output file not created");
}

#[test]
fn test_svg_format_conversion() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.svg");
    let output_path = temp_dir.path().join("test.cur");

    // Create a simple SVG
    let svg_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" fill="red"/>
    <circle cx="16" cy="16" r="8" fill="blue"/>
</svg>"#;

    std::fs::write(&input_path, svg_content).expect("Failed to write SVG");

    // Convert to cursor
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

    assert!(result.is_ok(), "SVG conversion failed: {:?}", result.err());
    assert!(output_path.exists(), "Output file not created");
}

#[test]
fn test_missing_file_error() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("nonexistent.png");
    let output_path = temp_dir.path().join("test.cur");

    // Try to convert non-existent file
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

    assert!(result.is_err(), "Should fail for missing file");
    let error = result.unwrap_err();
    assert!(
        error.contains("Failed to") || error.contains("No such file"),
        "Error should indicate file issue: {}",
        error
    );
}

#[test]
fn test_corrupted_png_error() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("corrupted.png");
    let output_path = temp_dir.path().join("test.cur");

    // Write corrupted PNG data
    std::fs::write(&input_path, b"This is not a valid PNG file").expect("Failed to write file");

    // Try to convert corrupted file
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

    assert!(result.is_err(), "Should fail for corrupted PNG");
}

#[test]
fn test_corrupted_svg_error() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("corrupted.svg");
    let output_path = temp_dir.path().join("test.cur");

    // Write corrupted SVG data
    std::fs::write(&input_path, b"<svg>This is not valid SVG").expect("Failed to write file");

    // Try to convert corrupted file
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

    assert!(result.is_err(), "Should fail for corrupted SVG");
}

#[test]
fn test_empty_file_error() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("empty.png");
    let output_path = temp_dir.path().join("test.cur");

    // Write empty file
    std::fs::write(&input_path, b"").expect("Failed to write file");

    // Try to convert empty file
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

    assert!(result.is_err(), "Should fail for empty file");
}

#[test]
fn test_unsupported_format_error() {
    let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let input_path = temp_dir.path().join("test.txt");
    let output_path = temp_dir.path().join("test.cur");

    // Write a text file
    std::fs::write(&input_path, b"This is a text file").expect("Failed to write file");

    // Try to convert unsupported format
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

    assert!(result.is_err(), "Should fail for unsupported format");
    let error = result.unwrap_err();
    assert!(
        error.contains("Unsupported") || error.contains("txt"),
        "Error should mention unsupported format: {}",
        error
    );
}

#[test]
fn test_transparency_handling() {
    // Create an image with varying transparency
    let image = ImageBuffer::from_fn(32, 32, |x, y| {
        let alpha = ((x + y) * 255 / 64) as u8;
        Rgba([255, 0, 0, alpha])
    });

    let result = generate_cur_data(&image, 0, 0);
    assert!(
        result.is_ok(),
        "Failed to handle transparency: {:?}",
        result.err()
    );
}

#[test]
fn test_fully_transparent_image() {
    // Create a fully transparent image
    let image = ImageBuffer::from_pixel(32, 32, Rgba([0, 0, 0, 0]));

    let result = generate_cur_data(&image, 0, 0);
    assert!(
        result.is_ok(),
        "Failed to handle fully transparent image: {:?}",
        result.err()
    );
}

#[test]
fn test_non_square_dimensions() {
    // Test with non-square dimensions
    let sizes = [(16, 32), (32, 16), (64, 128), (128, 64)];

    for (width, height) in sizes.iter() {
        let image = create_test_image(*width, *height);
        let result = generate_cur_data(&image, 0, 0);
        assert!(
            result.is_ok(),
            "Failed to generate {}x{} cursor: {:?}",
            width,
            height,
            result.err()
        );
    }
}

#[test]
fn test_hotspot_at_maximum_coordinates() {
    let size = 128;
    let image = create_test_image(size, size);

    // Test hotspot at maximum valid coordinates
    let result = generate_cur_data(&image, (size - 1) as u16, (size - 1) as u16);
    assert!(
        result.is_ok(),
        "Failed with hotspot at max coordinates: {:?}",
        result.err()
    );
}

#[test]
fn test_256x256_uses_png_format() {
    // 256x256 and larger should use embedded PNG format
    let image = create_test_image(256, 256);
    let result = generate_cur_data(&image, 0, 0);

    assert!(
        result.is_ok(),
        "Failed to generate 256x256 cursor: {:?}",
        result.err()
    );

    let cur_data = result.unwrap();

    // Check for PNG signature at the image data offset (22 bytes into file)
    let offset = 22;
    assert!(
        cur_data.len() >= offset + 8,
        "CUR data too small for PNG check"
    );

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    let png_signature = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    assert_eq!(
        &cur_data[offset..offset + 8],
        png_signature,
        "256x256 cursor should use PNG format"
    );
}

#[test]
fn test_all_sizes_use_png_format() {
    // All cursor sizes now use PNG format for maximum quality
    let image = create_test_image(128, 128);
    let result = generate_cur_data(&image, 0, 0);

    assert!(
        result.is_ok(),
        "Failed to generate 128x128 cursor: {:?}",
        result.err()
    );

    let cur_data = result.unwrap();

    // Check for PNG signature at offset 22
    let offset = 22;
    assert!(cur_data.len() >= offset + 8, "CUR data too small");

    let png_signature = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    assert_eq!(
        &cur_data[offset..offset + 8],
        png_signature,
        "All cursors should use PNG format for maximum quality"
    );
}
