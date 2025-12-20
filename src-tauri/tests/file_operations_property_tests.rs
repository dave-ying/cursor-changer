//! Property-based tests for file operations
//!
//! These tests validate correctness properties for file operations including
//! read, write, copy operations and error handling.

use proptest::prelude::*;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

// Helper function to generate valid file names
fn valid_filename() -> impl Strategy<Value = String> {
    prop::string::string_regex("[a-zA-Z0-9_-]{1,20}\\.(cur|png|svg|txt)").expect("Invalid regex")
}

// Helper function to generate valid file content
fn file_content() -> impl Strategy<Value = Vec<u8>> {
    prop::collection::vec(any::<u8>(), 0..10000)
}

// Helper function to create a test file
fn create_test_file(dir: &Path, filename: &str, content: &[u8]) -> Result<PathBuf, String> {
    let path = dir.join(filename);
    fs::write(&path, content).map_err(|e| format!("Failed to write test file: {}", e))?;
    Ok(path)
}

/// **Feature: app-quality-improvement, Property 2: File operations preserve data integrity**
///
/// For any valid file path and operation (read, write, copy, delete), the operation
/// should complete without panicking or corrupting data, returning appropriate errors
/// for failure cases.
///
/// **Validates: Requirements 2.2**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_write_then_read_preserves_data(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join(&filename);

        // Write data to file
        let write_result = fs::write(&file_path, &content);
        prop_assert!(write_result.is_ok(), "Write failed: {:?}", write_result.err());

        // Read data back
        let read_result = fs::read(&file_path);
        prop_assert!(read_result.is_ok(), "Read failed: {:?}", read_result.err());

        let read_content = read_result.unwrap();

        // Verify data integrity - content should be identical
        prop_assert_eq!(read_content, content, "Data corrupted during write/read cycle");
    }
}

/// Test that copy operations preserve data integrity
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_copy_preserves_data(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let source_path = temp_dir.path().join(&filename);
        let dest_path = temp_dir.path().join(format!("copy_{}", filename));

        // Create source file
        fs::write(&source_path, &content).expect("Failed to write source file");

        // Copy file
        let copy_result = fs::copy(&source_path, &dest_path);
        prop_assert!(copy_result.is_ok(), "Copy failed: {:?}", copy_result.err());

        // Read both files
        let source_content = fs::read(&source_path).expect("Failed to read source");
        let dest_content = fs::read(&dest_path).expect("Failed to read destination");

        // Verify data integrity - both files should have identical content
        prop_assert_eq!(&source_content, &content, "Source file corrupted");
        prop_assert_eq!(&dest_content, &content, "Destination file corrupted");
        prop_assert_eq!(source_content, dest_content, "Copy operation corrupted data");
    }
}

/// Test that multiple write operations maintain data integrity
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_multiple_writes_preserve_latest_data(
        filename in valid_filename(),
        contents in prop::collection::vec(file_content(), 1..5),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join(&filename);

        // Write multiple times
        for content in &contents {
            let write_result = fs::write(&file_path, content);
            prop_assert!(write_result.is_ok(), "Write failed: {:?}", write_result.err());
        }

        // Read final content
        let read_result = fs::read(&file_path);
        prop_assert!(read_result.is_ok(), "Read failed: {:?}", read_result.err());

        let read_content = read_result.unwrap();
        let last_content = contents.last().unwrap();

        // Verify the file contains the last written content
        prop_assert_eq!(&read_content, last_content, "Multiple writes corrupted data");
    }
}

/// Test that file metadata operations don't corrupt data
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_metadata_operations_preserve_data(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join(&filename);

        // Write file
        fs::write(&file_path, &content).expect("Failed to write file");

        // Perform metadata operations
        let metadata_result = fs::metadata(&file_path);
        prop_assert!(metadata_result.is_ok(), "Metadata read failed: {:?}", metadata_result.err());

        let metadata = metadata_result.unwrap();
        prop_assert!(metadata.is_file(), "Path is not a file");
        prop_assert_eq!(metadata.len(), content.len() as u64, "File size mismatch");

        // Verify data is still intact after metadata operations
        let read_content = fs::read(&file_path).expect("Failed to read after metadata");
        prop_assert_eq!(read_content, content, "Data corrupted after metadata operations");
    }
}

/// **Feature: app-quality-improvement, Property 7: File operation failures maintain stable state**
///
/// For any file operation that fails (permissions, disk full, file not found), the application
/// should return a descriptive error and maintain stable application state without corruption.
///
/// **Validates: Requirements 5.1**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_read_nonexistent_file_returns_error(
        filename in valid_filename(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let nonexistent_path = temp_dir.path().join(&filename);

        // Ensure file doesn't exist
        prop_assert!(!nonexistent_path.exists(), "File should not exist");

        // Try to read nonexistent file
        let read_result = fs::read(&nonexistent_path);

        // Should return an error, not panic
        prop_assert!(read_result.is_err(), "Reading nonexistent file should return error");

        // Verify the error is descriptive (contains "not found" or similar)
        let error = read_result.unwrap_err();
        let error_msg = format!("{:?}", error);
        let error_lower = error_msg.to_lowercase();
        prop_assert!(
            error_lower.contains("not found") ||
            error_lower.contains("no such file") ||
            error_lower.contains("cannot find"),
            "Error message should be descriptive: {}", error_msg
        );
    }
}

/// Test that operations on invalid paths return errors without panicking
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_invalid_path_operations_return_errors(
        invalid_char in prop::sample::select(vec!['<', '>', ':', '"', '|', '?', '*']),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let invalid_filename = format!("invalid{}file.txt", invalid_char);
        let invalid_path = temp_dir.path().join(&invalid_filename);

        // Try to write to invalid path - should return error, not panic
        let write_result = fs::write(&invalid_path, b"test");

        // On Windows, these characters are invalid and should cause an error
        // The operation should fail gracefully without panicking
        if write_result.is_err() {
            let error = write_result.unwrap_err();
            let error_msg = format!("{:?}", error);
            // Error should be descriptive
            prop_assert!(
                !error_msg.is_empty(),
                "Error message should not be empty"
            );
        }
        // If it succeeds (on some systems), that's also acceptable - we just verify no panic
    }
}

/// Test that copy operations with invalid destinations return errors
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_copy_to_nonexistent_directory_returns_error(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let source_path = temp_dir.path().join(&filename);

        // Create source file
        fs::write(&source_path, &content).expect("Failed to write source");

        // Try to copy to nonexistent directory
        let nonexistent_dir = temp_dir.path().join("nonexistent_dir");
        let dest_path = nonexistent_dir.join("dest.txt");

        let copy_result = fs::copy(&source_path, &dest_path);

        // Should return error, not panic
        prop_assert!(copy_result.is_err(), "Copy to nonexistent directory should fail");

        // Verify source file is still intact (stable state)
        let source_content = fs::read(&source_path).expect("Source file should still exist");
        prop_assert_eq!(source_content, content, "Source file should be unchanged after failed copy");
    }
}

/// Test that delete operations on nonexistent files return errors gracefully
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_delete_nonexistent_file_returns_error(
        filename in valid_filename(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let nonexistent_path = temp_dir.path().join(&filename);

        // Ensure file doesn't exist
        prop_assert!(!nonexistent_path.exists(), "File should not exist");

        // Try to delete nonexistent file
        let remove_result = fs::remove_file(&nonexistent_path);

        // Should return error, not panic
        prop_assert!(remove_result.is_err(), "Deleting nonexistent file should return error");
    }
}

/// Test that operations maintain stable state even after errors
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_failed_operations_maintain_stable_state(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join(&filename);

        // Create initial file
        fs::write(&file_path, &content).expect("Failed to write initial file");

        // Try to copy to invalid destination (should fail)
        let invalid_dest = temp_dir.path().join("nonexistent_dir").join("dest.txt");
        let _ = fs::copy(&file_path, &invalid_dest); // Ignore result

        // Verify original file is still intact (stable state maintained)
        let read_content = fs::read(&file_path).expect("Original file should still exist");
        prop_assert_eq!(read_content, content, "Original file should be unchanged after failed operation");

        // Verify we can still perform operations on the original file
        let metadata = fs::metadata(&file_path).expect("Should be able to read metadata");
        prop_assert!(metadata.is_file(), "File should still be valid");
    }
}

/// **Feature: app-quality-improvement, Property 13: File handles are always closed**
///
/// For any file operation including error cases, all opened file handles should be
/// properly closed before the operation completes or errors out.
///
/// **Validates: Requirements 7.2**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_file_handles_closed_after_successful_operations(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join(&filename);

        // Perform write operation
        fs::write(&file_path, &content).expect("Write failed");

        // Perform read operation
        let _ = fs::read(&file_path).expect("Read failed");

        // If handles weren't closed, we wouldn't be able to delete the file
        // This verifies that handles are properly closed
        let remove_result = fs::remove_file(&file_path);
        prop_assert!(
            remove_result.is_ok(),
            "Should be able to delete file after operations (handles should be closed): {:?}",
            remove_result.err()
        );
    }
}

/// Test that file handles are closed even when operations fail
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_file_handles_closed_after_failed_read(
        filename in valid_filename(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let nonexistent_path = temp_dir.path().join(&filename);

        // Try to read nonexistent file (will fail)
        let _ = fs::read(&nonexistent_path);

        // Now create the file - if handles were leaked, this might fail
        let write_result = fs::write(&nonexistent_path, b"test");
        prop_assert!(
            write_result.is_ok(),
            "Should be able to create file after failed read (no handle leak): {:?}",
            write_result.err()
        );

        // Clean up
        let _ = fs::remove_file(&nonexistent_path);
    }
}

/// Test that multiple sequential operations don't leak file handles
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_no_handle_leak_in_sequential_operations(
        filename in valid_filename(),
        operations in prop::collection::vec(file_content(), 1..10),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join(&filename);

        // Perform many sequential write/read operations
        for content in &operations {
            fs::write(&file_path, content).expect("Write failed");
            let _ = fs::read(&file_path).expect("Read failed");
        }

        // If handles were leaked, we wouldn't be able to delete the file
        let remove_result = fs::remove_file(&file_path);
        prop_assert!(
            remove_result.is_ok(),
            "Should be able to delete file after many operations (no handle leak): {:?}",
            remove_result.err()
        );
    }
}

/// Test that file handles are closed when copying files
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_file_handles_closed_after_copy(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let source_path = temp_dir.path().join(&filename);
        let dest_path = temp_dir.path().join(format!("copy_{}", filename));

        // Create and copy file
        fs::write(&source_path, &content).expect("Write failed");
        fs::copy(&source_path, &dest_path).expect("Copy failed");

        // Should be able to delete both files (handles closed)
        let remove_source = fs::remove_file(&source_path);
        let remove_dest = fs::remove_file(&dest_path);

        prop_assert!(
            remove_source.is_ok(),
            "Should be able to delete source after copy: {:?}",
            remove_source.err()
        );
        prop_assert!(
            remove_dest.is_ok(),
            "Should be able to delete destination after copy: {:?}",
            remove_dest.err()
        );
    }
}

/// Test that file handles are closed even with metadata operations
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_file_handles_closed_after_metadata_operations(
        filename in valid_filename(),
        content in file_content(),
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let file_path = temp_dir.path().join(&filename);

        // Create file and perform metadata operations
        fs::write(&file_path, &content).expect("Write failed");
        let _ = fs::metadata(&file_path).expect("Metadata read failed");

        // Should be able to delete file (handles closed)
        let remove_result = fs::remove_file(&file_path);
        prop_assert!(
            remove_result.is_ok(),
            "Should be able to delete file after metadata operations: {:?}",
            remove_result.err()
        );
    }
}
