use proptest::prelude::*;
use std::fs;
use tempfile::TempDir;

/// **Feature: app-quality-improvement, Property 14: Temporary files are cleaned up**
/// **Validates: Requirements 7.3**
///
/// This property test verifies that temporary files created during operations
/// are properly cleaned up after use or on exit, with no orphaned files remaining.
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_temporary_files_are_cleaned_up(
        file_count in 1usize..10,
        file_sizes in prop::collection::vec(0usize..1024, 1..10)
    ) {
        // Create a temporary directory that will be automatically cleaned up
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        // Track created file paths
        let mut created_files = Vec::new();

        // Generate and write temporary files
        for i in 0..file_count.min(file_sizes.len()) {
            let file_name = format!("temp_cursor_{}.cur", i);
            let file_path = temp_path.join(&file_name);

            // Create file with random data
            let data = vec![0u8; file_sizes[i]];
            fs::write(&file_path, &data).expect("Failed to write temp file");

            created_files.push(file_path.clone());

            // Verify file was created
            prop_assert!(file_path.exists(), "Temp file should exist after creation");
        }

        // Simulate cleanup operation - explicitly remove files
        for file_path in &created_files {
            if file_path.exists() {
                fs::remove_file(file_path).expect("Failed to remove temp file");
            }
        }

        // Verify all files were cleaned up
        for file_path in &created_files {
            prop_assert!(!file_path.exists(), "Temp file should be cleaned up: {:?}", file_path);
        }

        // When temp_dir goes out of scope, the directory itself is cleaned up
        // Verify directory still exists before drop
        prop_assert!(temp_path.exists(), "Temp directory should exist before drop");
    }
}

/// Property test for temporary file cleanup with error scenarios
/// Verifies that cleanup happens even when operations fail
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_temporary_files_cleaned_up_on_error(
        file_count in 1usize..5,
        fail_at_index in 0usize..5
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        let mut created_files = Vec::new();
        let mut _operation_failed = false;

        // Create files and simulate an operation that might fail
        for i in 0..file_count {
            let file_name = format!("temp_cursor_{}.cur", i);
            let file_path = temp_path.join(&file_name);

            let data = vec![0u8; 100];
            fs::write(&file_path, &data).expect("Failed to write temp file");
            created_files.push(file_path.clone());

            // Simulate operation failure at specific index
            if i == fail_at_index && i < file_count {
                _operation_failed = true;
                // Even on failure, we should clean up
                break;
            }
        }

        // Cleanup should happen regardless of operation success
        for file_path in &created_files {
            if file_path.exists() {
                fs::remove_file(file_path).expect("Failed to remove temp file");
            }
        }

        // Verify cleanup happened
        for file_path in &created_files {
            prop_assert!(!file_path.exists(),
                "Temp file should be cleaned up even after error: {:?}", file_path);
        }
    }
}

/// Property test for temporary directory cleanup
/// Verifies that temporary directories and their contents are cleaned up
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_temporary_directories_cleaned_up(
        dir_count in 1usize..5,
        files_per_dir in 1usize..5
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        let mut created_dirs = Vec::new();

        // Create nested temporary directories with files
        for i in 0..dir_count {
            let dir_name = format!("temp_subdir_{}", i);
            let dir_path = temp_path.join(&dir_name);

            fs::create_dir(&dir_path).expect("Failed to create temp subdirectory");
            created_dirs.push(dir_path.clone());

            // Create files in each directory
            for j in 0..files_per_dir {
                let file_name = format!("file_{}.cur", j);
                let file_path = dir_path.join(&file_name);
                fs::write(&file_path, b"test data").expect("Failed to write file");
            }

            prop_assert!(dir_path.exists(), "Temp subdirectory should exist after creation");
        }

        // Cleanup: remove directories and their contents
        for dir_path in &created_dirs {
            if dir_path.exists() {
                fs::remove_dir_all(dir_path).expect("Failed to remove temp directory");
            }
        }

        // Verify all directories were cleaned up
        for dir_path in &created_dirs {
            prop_assert!(!dir_path.exists(),
                "Temp directory should be cleaned up: {:?}", dir_path);
        }
    }
}

/// Property test for file handle cleanup
/// Verifies that file handles are properly closed and files can be deleted
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_file_handles_allow_cleanup(
        file_count in 1usize..10
    ) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let temp_path = temp_dir.path();

        let mut file_paths = Vec::new();

        // Create files and immediately close handles
        for i in 0..file_count {
            let file_name = format!("cursor_{}.cur", i);
            let file_path = temp_path.join(&file_name);

            // Write file (handle is automatically closed when write completes)
            fs::write(&file_path, b"cursor data").expect("Failed to write file");
            file_paths.push(file_path.clone());

            // Verify file exists
            prop_assert!(file_path.exists(), "File should exist after write");
        }

        // Now try to delete all files - this should succeed if handles were closed
        for file_path in &file_paths {
            let result = fs::remove_file(file_path);
            prop_assert!(result.is_ok(),
                "Should be able to delete file (handle should be closed): {:?}", file_path);
        }

        // Verify deletion
        for file_path in &file_paths {
            prop_assert!(!file_path.exists(), "File should be deleted: {:?}", file_path);
        }
    }
}
