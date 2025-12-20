//! Unit tests for error recovery mechanisms
//!
//! Tests retry mechanisms, fallback mechanisms, and state restoration after errors.
//!
//! Requirements: 5.4

use cursor_changer_tauri::cursor_converter::convert_to_cur;
use image::{ImageBuffer, Rgba};
use std::fs;
use tempfile::TempDir;

#[test]
fn test_successful_conversion_after_failed_attempt() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // First attempt: invalid file
    let invalid_input = temp_dir.path().join("invalid.png");
    let output1 = temp_dir.path().join("output1.cur");
    fs::write(&invalid_input, b"not an image").expect("Failed to write invalid file");

    let result1 = convert_to_cur(
        invalid_input.to_str().unwrap(),
        output1.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    assert!(result1.is_err(), "First attempt should fail");

    // Second attempt: valid file (recovery)
    let valid_input = temp_dir.path().join("valid.png");
    let output2 = temp_dir.path().join("output2.cur");

    let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([255u8, 0u8, 0u8, 255u8]));
    image
        .save(&valid_input)
        .expect("Failed to save valid image");

    let result2 = convert_to_cur(
        valid_input.to_str().unwrap(),
        output2.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Second attempt should succeed (system recovered)
    assert!(
        result2.is_ok(),
        "Second attempt should succeed after error: {:?}",
        result2.err()
    );
    assert!(output2.exists(), "Output file should exist after recovery");
}

#[test]
fn test_multiple_recovery_attempts() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let output = temp_dir.path().join("output.cur");

    // Multiple failed attempts
    for i in 0..3 {
        let invalid_input = temp_dir.path().join(format!("invalid{}.png", i));
        fs::write(&invalid_input, format!("invalid data {}", i)).expect("Failed to write");

        let result = convert_to_cur(
            invalid_input.to_str().unwrap(),
            output.to_str().unwrap(),
            32,
            0,
            0,
            1.0,
            0,
            0,
        );

        assert!(result.is_err(), "Attempt {} should fail", i);
    }

    // Final successful attempt
    let valid_input = temp_dir.path().join("valid.png");
    let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([0u8, 255u8, 0u8, 255u8]));
    image
        .save(&valid_input)
        .expect("Failed to save valid image");

    let result = convert_to_cur(
        valid_input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Should succeed after multiple failures
    assert!(
        result.is_ok(),
        "Should recover after multiple failures: {:?}",
        result.err()
    );
}

#[test]
fn test_state_not_corrupted_after_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Create a valid baseline
    let baseline_input = temp_dir.path().join("baseline.png");
    let baseline_output = temp_dir.path().join("baseline.cur");

    let image1: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([255u8, 0u8, 0u8, 255u8]));
    image1
        .save(&baseline_input)
        .expect("Failed to save baseline");

    convert_to_cur(
        baseline_input.to_str().unwrap(),
        baseline_output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    )
    .expect("Baseline conversion should succeed");

    let baseline_size = fs::metadata(&baseline_output)
        .expect("Failed to read baseline")
        .len();

    // Cause an error
    let invalid_input = temp_dir.path().join("invalid.png");
    let error_output = temp_dir.path().join("error.cur");
    fs::write(&invalid_input, b"invalid").expect("Failed to write invalid file");

    let _ = convert_to_cur(
        invalid_input.to_str().unwrap(),
        error_output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Create another valid conversion to verify state is not corrupted
    let recovery_input = temp_dir.path().join("recovery.png");
    let recovery_output = temp_dir.path().join("recovery.cur");

    let image2: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([0u8, 255u8, 0u8, 255u8]));
    image2
        .save(&recovery_input)
        .expect("Failed to save recovery image");

    convert_to_cur(
        recovery_input.to_str().unwrap(),
        recovery_output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    )
    .expect("Recovery conversion should succeed");

    let recovery_size = fs::metadata(&recovery_output)
        .expect("Failed to read recovery")
        .len();

    // Both conversions should produce similar-sized valid files
    assert!(
        (baseline_size as i64 - recovery_size as i64).abs() < 1000,
        "State should not be corrupted after error"
    );
}

#[test]
fn test_partial_output_cleaned_up_on_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let invalid_input = temp_dir.path().join("invalid.png");
    let output = temp_dir.path().join("output.cur");

    // Write invalid data
    fs::write(&invalid_input, b"invalid image data").expect("Failed to write invalid file");

    // Try to convert (should fail)
    let result = convert_to_cur(
        invalid_input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    assert!(result.is_err(), "Conversion should fail");

    // Output file should either not exist or be invalid/empty
    if output.exists() {
        let output_size = fs::metadata(&output).expect("Failed to read output").len();
        assert!(
            output_size < 22,
            "Partial output should be cleaned up or not created"
        );
    }
}

#[test]
fn test_error_doesnt_affect_existing_files() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Create an existing valid cursor file
    let existing_output = temp_dir.path().join("existing.cur");
    let existing_input = temp_dir.path().join("existing.png");

    let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([128u8, 128u8, 128u8, 255u8]));
    image
        .save(&existing_input)
        .expect("Failed to save existing image");

    convert_to_cur(
        existing_input.to_str().unwrap(),
        existing_output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    )
    .expect("Initial conversion should succeed");

    let original_content = fs::read(&existing_output).expect("Failed to read existing file");

    // Try to convert an invalid file to a different location
    let invalid_input = temp_dir.path().join("invalid.png");
    let invalid_output = temp_dir.path().join("invalid.cur");
    fs::write(&invalid_input, b"invalid").expect("Failed to write invalid file");

    let _ = convert_to_cur(
        invalid_input.to_str().unwrap(),
        invalid_output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Existing file should be unchanged
    let current_content = fs::read(&existing_output).expect("Failed to read existing file");
    assert_eq!(
        original_content, current_content,
        "Existing files should not be affected by errors"
    );
}

#[test]
fn test_concurrent_operations_with_errors() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Simulate concurrent operations where some fail
    let mut results = Vec::new();

    for i in 0..5 {
        let input = temp_dir.path().join(format!("input{}.png", i));
        let output = temp_dir.path().join(format!("output{}.cur", i));

        if i % 2 == 0 {
            // Valid conversion
            let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
                ImageBuffer::from_pixel(32, 32, Rgba([i as u8 * 50, 0u8, 0u8, 255u8]));
            image.save(&input).expect("Failed to save image");
        } else {
            // Invalid conversion
            fs::write(&input, format!("invalid {}", i)).expect("Failed to write invalid file");
        }

        let result = convert_to_cur(
            input.to_str().unwrap(),
            output.to_str().unwrap(),
            32,
            0,
            0,
            1.0,
            0,
            0,
        );

        results.push((i, result));
    }

    // Check that valid conversions succeeded and invalid ones failed
    for (i, result) in results {
        if i % 2 == 0 {
            assert!(result.is_ok(), "Valid conversion {} should succeed", i);
        } else {
            assert!(result.is_err(), "Invalid conversion {} should fail", i);
        }
    }
}

#[test]
fn test_error_recovery_with_different_sizes() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Try with invalid size first
    let input = temp_dir.path().join("test.png");
    let output = temp_dir.path().join("output.cur");

    let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([255u8, 0u8, 0u8, 255u8]));
    image.save(&input).expect("Failed to save image");

    // Try with extremely large size (might fail or be clamped)
    let result1 = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        10000,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Try with valid size (should work)
    let result2 = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        64,
        0,
        0,
        1.0,
        0,
        0,
    );

    // Second attempt with valid size should succeed
    assert!(
        result2.is_ok(),
        "Should recover with valid size: {:?}",
        result2.err()
    );
}

#[test]
fn test_fallback_to_default_on_invalid_hotspot() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let input = temp_dir.path().join("test.png");
    let output = temp_dir.path().join("output.cur");

    let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([0u8, 255u8, 0u8, 255u8]));
    image.save(&input).expect("Failed to save image");

    // Try with invalid hotspot (outside bounds)
    let result = convert_to_cur(
        input.to_str().unwrap(),
        output.to_str().unwrap(),
        32,
        1000,
        1000,
        1.0,
        0,
        0,
    );

    // Should either succeed (clamped to valid range) or return clear error
    if result.is_ok() {
        // If it succeeded, verify output exists
        assert!(
            output.exists(),
            "Output should exist if conversion succeeded"
        );
    } else {
        // If it failed, error should be descriptive
        let error_msg = result.unwrap_err();
        assert!(
            !error_msg.is_empty() && error_msg.len() > 5,
            "Error message should be descriptive"
        );
    }
}

#[test]
fn test_system_remains_functional_after_errors() {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");

    // Cause multiple different types of errors
    let _ = convert_to_cur("/nonexistent.png", "/output.cur", 32, 0, 0, 1.0, 0, 0);

    let invalid_ext = temp_dir.path().join("test.txt");
    fs::write(&invalid_ext, b"data").expect("Failed to write");
    let _ = convert_to_cur(
        invalid_ext.to_str().unwrap(),
        "/output.cur",
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    let invalid_data = temp_dir.path().join("test.png");
    fs::write(&invalid_data, b"invalid").expect("Failed to write");
    let _ = convert_to_cur(
        invalid_data.to_str().unwrap(),
        "/output.cur",
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    // System should still work after all these errors
    let valid_input = temp_dir.path().join("valid.png");
    let valid_output = temp_dir.path().join("valid.cur");

    let image: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(32, 32, Rgba([255u8, 255u8, 0u8, 255u8]));
    image
        .save(&valid_input)
        .expect("Failed to save valid image");

    let result = convert_to_cur(
        valid_input.to_str().unwrap(),
        valid_output.to_str().unwrap(),
        32,
        0,
        0,
        1.0,
        0,
        0,
    );

    assert!(
        result.is_ok(),
        "System should remain functional after multiple errors: {:?}",
        result.err()
    );
}
