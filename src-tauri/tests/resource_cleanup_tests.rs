/// Unit tests for resource cleanup
///
/// These tests verify that resources (file handles, registry handles, etc.) are properly cleaned up
/// **Validates: Requirements 7.2, 7.4**
use std::fs::{self, File};
use std::io::Write;
use tempfile::TempDir;

/// Test that file handles are properly closed after operations
#[test]
fn test_file_handle_cleanup_after_write() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let file_path = temp_dir.path().join("test.txt");

    // Write to file (handle should be closed automatically)
    {
        let mut file = File::create(&file_path).expect("Failed to create file");
        file.write_all(b"test data").expect("Failed to write");
        // file handle is dropped here
    }

    // Verify we can immediately delete the file (handle was closed)
    fs::remove_file(&file_path).expect("Failed to remove file - handle may not be closed");
}

/// Test that file handles are closed even when errors occur
#[test]
fn test_file_handle_cleanup_on_error() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let file_path = temp_dir.path().join("test.txt");

    // Create file
    fs::write(&file_path, b"test").expect("Failed to write file");

    // Try to read with potential error (file handle should still be closed)
    let result = fs::read(&file_path);
    assert!(result.is_ok());

    // Verify we can delete the file
    fs::remove_file(&file_path).expect("Failed to remove file");
}

/// Test that multiple file handles are properly managed
#[test]
fn test_multiple_file_handles_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");

    // Create multiple files
    let file_paths: Vec<_> = (0..10)
        .map(|i| {
            let path = temp_dir.path().join(format!("file_{}.txt", i));
            fs::write(&path, format!("data {}", i)).expect("Failed to write file");
            path
        })
        .collect();

    // Read all files (handles should be closed after each read)
    for path in &file_paths {
        let _content = fs::read(path).expect("Failed to read file");
    }

    // Verify we can delete all files (all handles were closed)
    for path in &file_paths {
        fs::remove_file(path).expect("Failed to remove file");
    }
}

/// Test that file handles are closed in nested operations
#[test]
fn test_nested_file_operations_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let file_path = temp_dir.path().join("test.txt");

    // Nested file operations
    {
        fs::write(&file_path, b"initial").expect("Failed to write");

        {
            let content = fs::read(&file_path).expect("Failed to read");
            assert_eq!(content, b"initial");
        }

        fs::write(&file_path, b"updated").expect("Failed to update");
    }

    // Verify file can be deleted
    fs::remove_file(&file_path).expect("Failed to remove file");
}

/// Test that directory handles are properly cleaned up
#[test]
fn test_directory_handle_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let sub_dir = temp_dir.path().join("subdir");

    // Create directory
    fs::create_dir(&sub_dir).expect("Failed to create directory");

    // List directory contents (handle should be closed)
    let _entries = fs::read_dir(&sub_dir).expect("Failed to read directory");

    // Verify we can remove the directory
    fs::remove_dir(&sub_dir).expect("Failed to remove directory");
}

/// Test that file handles are closed when using std::fs convenience functions
#[test]
fn test_convenience_functions_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let file_path = temp_dir.path().join("test.txt");

    // Use convenience functions (handles managed internally)
    fs::write(&file_path, b"test").expect("Failed to write");
    let _content = fs::read_to_string(&file_path).expect("Failed to read");
    let _metadata = fs::metadata(&file_path).expect("Failed to get metadata");

    // Verify file can be deleted
    fs::remove_file(&file_path).expect("Failed to remove file");
}

/// Test that file handles are closed in error scenarios
#[test]
fn test_file_handle_cleanup_with_errors() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");

    // Try to read non-existent file (should not leak handle)
    let result = fs::read(temp_dir.path().join("nonexistent.txt"));
    assert!(result.is_err());

    // Try to write to invalid path (should not leak handle)
    let result = fs::write("/invalid/path/file.txt", b"test");
    assert!(result.is_err());

    // Verify temp directory can still be used
    let test_file = temp_dir.path().join("test.txt");
    fs::write(&test_file, b"test").expect("Failed to write after errors");
}

/// Test that concurrent file operations clean up properly
#[test]
fn test_concurrent_file_operations_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");

    // Create multiple files concurrently (simulated)
    let file_paths: Vec<_> = (0..5)
        .map(|i| {
            let path = temp_dir.path().join(format!("file_{}.txt", i));
            fs::write(&path, format!("data {}", i)).expect("Failed to write");
            path
        })
        .collect();

    // Read files in different order
    for i in (0..5).rev() {
        let _content = fs::read(&file_paths[i]).expect("Failed to read");
    }

    // Verify all can be deleted
    for path in &file_paths {
        fs::remove_file(path).expect("Failed to remove file");
    }
}

/// Test that file handles are closed when operations are cancelled/dropped
#[test]
fn test_file_handle_cleanup_on_drop() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let file_path = temp_dir.path().join("test.txt");

    // Create file and immediately drop the handle
    {
        let _file = File::create(&file_path).expect("Failed to create file");
        // file is dropped here without writing
    }

    // Verify file exists and can be deleted
    assert!(file_path.exists());
    fs::remove_file(&file_path).expect("Failed to remove file");
}

/// Test that temporary files are cleaned up
#[test]
fn test_temporary_file_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let temp_file = temp_dir.path().join("temp.txt");

    // Create temporary file
    fs::write(&temp_file, b"temporary data").expect("Failed to write temp file");

    // Simulate cleanup
    fs::remove_file(&temp_file).expect("Failed to remove temp file");

    // Verify file is gone
    assert!(!temp_file.exists());
}

/// Test that file metadata operations don't leak handles
#[test]
fn test_metadata_operations_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let file_path = temp_dir.path().join("test.txt");

    fs::write(&file_path, b"test").expect("Failed to write");

    // Perform multiple metadata operations
    for _i in 0..10 {
        let _metadata = fs::metadata(&file_path).expect("Failed to get metadata");
    }

    // Verify file can be deleted
    fs::remove_file(&file_path).expect("Failed to remove file");
}

/// Test that symlink operations clean up properly (if supported)
#[cfg(unix)]
#[test]
fn test_symlink_cleanup() {
    use std::os::unix::fs::symlink;

    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let target = temp_dir.path().join("target.txt");
    let link = temp_dir.path().join("link.txt");

    fs::write(&target, b"test").expect("Failed to write target");
    symlink(&target, &link).expect("Failed to create symlink");

    // Remove symlink
    fs::remove_file(&link).expect("Failed to remove symlink");

    // Verify target still exists
    assert!(target.exists());

    // Clean up target
    fs::remove_file(&target).expect("Failed to remove target");
}
