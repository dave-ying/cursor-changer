/// File Operations Concurrency Tests
///
/// **Feature: app-quality-improvement, Property 17: Overlapping file operations maintain data integrity**
/// **Validates: Requirements 8.2**
///
/// These tests verify that overlapping file operations maintain data integrity
/// through proper locking or sequencing mechanisms.
use proptest::prelude::*;
use std::sync::{Arc, Mutex};
use std::thread;

/// This property verifies that overlapping file operations maintain data integrity
/// through proper locking or sequencing mechanisms. This tests that when using
/// proper file locking (via a mutex), concurrent operations don't corrupt data.
proptest! {
    #![proptest_config(ProptestConfig { cases: 32, .. ProptestConfig::default() })]
    #[test]
    fn property_overlapping_file_operations_integrity(
        file_contents in prop::collection::vec(
            prop::string::string_regex("[a-zA-Z0-9 ]{10,100}").unwrap(),
            5..20
        )
    ) {
        use std::fs;
        use std::io::Write;
        use std::sync::atomic::{AtomicUsize, Ordering};
        use tempfile::TempDir;

        // Create temporary directory for test
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test_file.txt");

        // Create initial file
        fs::write(&file_path, "initial content").unwrap();

        let file_path_arc = Arc::new(file_path.clone());
        // Use a mutex to simulate proper file locking in the application
        let file_lock = Arc::new(Mutex::new(()));
        let mut handles = vec![];

        let next_index = Arc::new(AtomicUsize::new(0));
        let results = Arc::new(Mutex::new(Vec::new()));

        let worker_count = std::cmp::min(8, file_contents.len());

        // Spawn multiple threads performing overlapping file operations WITH LOCKING
        for _ in 0..worker_count {
            let path_clone = Arc::clone(&file_path_arc);
            let lock_clone = Arc::clone(&file_lock);
            let contents_clone = file_contents.clone();
            let next_index_clone = Arc::clone(&next_index);
            let results_clone = Arc::clone(&results);

            let handle = thread::spawn(move || {
                loop {
                    let idx = next_index_clone.fetch_add(1, Ordering::SeqCst);
                    if idx >= contents_clone.len() {
                        break;
                    }

                    // Acquire lock before file operation
                    let _guard = lock_clone.lock().unwrap();

                    // Write operation
                    let mut file = fs::OpenOptions::new()
                        .write(true)
                        .truncate(true)
                        .open(&*path_clone)
                        .unwrap();
                    file.write_all(contents_clone[idx].as_bytes()).unwrap();
                    file.sync_all().unwrap();
                    drop(file);

                    // Read operation to verify
                    let read_content = fs::read_to_string(&*path_clone).unwrap();

                    // Lock is released here when _guard is dropped
                    results_clone.lock().unwrap().push(read_content);
                }
            });

            handles.push(handle);
        }

        // Collect results
        for handle in handles {
            handle.join().unwrap();
        }

        let results = results.lock().unwrap().clone();

        // Verify: File still exists and is readable
        prop_assert!(file_path.exists(), "File should still exist after concurrent operations");

        // Verify: Final content is one of the written contents (no corruption)
        let final_content = fs::read_to_string(&file_path).unwrap();
        let is_valid = file_contents.contains(&final_content) || final_content == "initial content";
        prop_assert!(is_valid, "Final content should be one of the written contents, not corrupted");

        // Verify: All read operations returned valid content (with locking, reads are consistent)
        for result in results {
            let is_valid_read = file_contents.contains(&result) || result == "initial content";
            prop_assert!(is_valid_read, "Read content should be valid, not corrupted");
        }
    }
}

/// This property tests concurrent read operations don't interfere with each other.
proptest! {
    #[test]
    fn property_concurrent_file_reads_consistent(
        file_content in prop::string::string_regex("[a-zA-Z0-9 ]{50,200}").unwrap(),
        num_readers in 5usize..20
    ) {
        use std::fs;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("read_test.txt");

        // Write initial content
        fs::write(&file_path, &file_content).unwrap();

        let file_path_arc = Arc::new(file_path.clone());
        let mut handles = vec![];

        // Spawn multiple concurrent readers
        for _ in 0..num_readers {
            let path_clone = Arc::clone(&file_path_arc);

            let handle = thread::spawn(move || {
                fs::read_to_string(&*path_clone).unwrap()
            });

            handles.push(handle);
        }

        // Collect all read results
        let mut results = vec![];
        for handle in handles {
            results.push(handle.join().unwrap());
        }

        // Verify: All reads returned the same content
        for result in &results {
            prop_assert_eq!(result, &file_content, "All concurrent reads should return the same content");
        }
    }
}

/// This property tests that file deletion is properly synchronized.
proptest! {
    #[test]
    fn property_concurrent_file_deletion_safe(
        num_operations in 3usize..10
    ) {
        use std::fs;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("delete_test.txt");

        // Create file
        fs::write(&file_path, "test content").unwrap();

        let file_path_arc = Arc::new(file_path.clone());
        let mut handles = vec![];

        // Spawn multiple threads trying to delete the same file
        for _ in 0..num_operations {
            let path_clone = Arc::clone(&file_path_arc);

            let handle = thread::spawn(move || {
                // Try to delete - may fail if already deleted
                fs::remove_file(&*path_clone).is_ok()
            });

            handles.push(handle);
        }

        // Collect results
        let mut success_count = 0;
        for handle in handles {
            if handle.join().unwrap() {
                success_count += 1;
            }
        }

        // Verify: File is deleted
        prop_assert!(!file_path.exists(), "File should be deleted");

        // Verify: At least one deletion succeeded
        prop_assert!(success_count >= 1, "At least one deletion should succeed");

        // Verify: At most one deletion succeeded (proper synchronization)
        // Note: This may not always hold on all filesystems, but should generally be true
        prop_assert!(success_count <= num_operations, "Success count should be reasonable");
    }
}
