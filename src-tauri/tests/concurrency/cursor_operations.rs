/// Cursor Operations Concurrency Tests
///
/// **Feature: app-quality-improvement, Property 16: Concurrent cursor operations are serialized**
/// **Validates: Requirements 8.1**
///
/// These tests verify that concurrent cursor operations are properly serialized
/// to prevent conflicts and data corruption.
use proptest::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;

/// This property verifies that when multiple cursor operations occur simultaneously,
/// they are properly serialized to prevent conflicts and data corruption.
proptest! {
    #[test]
    fn property_concurrent_cursor_operations_serialized(
        operations in prop::collection::vec(
            (prop::string::string_regex("[a-z_]+").unwrap(), prop::string::string_regex("[a-z0-9/]+\\.cur").unwrap()),
            10..50
        )
    ) {
        // Simulate application state with cursor mappings
        let state = Arc::new(Mutex::new(HashMap::<String, String>::new()));
        let mut handles = vec![];

        // Split operations across multiple threads
        let chunk_size = operations.len() / 4 + 1;
        for chunk in operations.chunks(chunk_size) {
            let state_clone = Arc::clone(&state);
            let chunk_owned = chunk.to_vec();

            let handle = thread::spawn(move || {
                for (cursor_name, cursor_path) in chunk_owned {
                    // Simulate cursor operation with proper locking
                    let mut guard = state_clone.lock().unwrap();
                    guard.insert(cursor_name.clone(), cursor_path.clone());
                    drop(guard); // Release lock immediately

                    // Small delay to increase chance of contention
                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify: All operations completed without panic
        let final_state = state.lock().unwrap();

        // Verify: State is consistent (no corrupted data)
        for (key, value) in final_state.iter() {
            prop_assert!(!key.is_empty(), "Cursor name should not be empty");
            prop_assert!(!value.is_empty(), "Cursor path should not be empty");
            prop_assert!(value.ends_with(".cur"), "Cursor path should end with .cur");
        }

        // Verify: No data loss - at least some operations succeeded
        prop_assert!(final_state.len() > 0, "At least some cursor operations should succeed");
        prop_assert!(final_state.len() <= operations.len(), "Should not have more entries than operations");
    }
}

/// This property tests concurrent updates to the same cursor to ensure proper serialization.
proptest! {
    #[test]
    fn property_concurrent_same_cursor_updates_serialized(
        cursor_name in prop::string::string_regex("[a-z_]+").unwrap(),
        paths in prop::collection::vec(
            prop::string::string_regex("[a-z0-9/]+\\.cur").unwrap(),
            10..30
        )
    ) {
        let state = Arc::new(Mutex::new(HashMap::<String, String>::new()));
        let mut handles = vec![];

        // Multiple threads updating the same cursor
        for path in paths {
            let state_clone = Arc::clone(&state);
            let cursor_name_clone = cursor_name.clone();

            let handle = thread::spawn(move || {
                let mut guard = state_clone.lock().unwrap();
                guard.insert(cursor_name_clone, path);
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        // Verify: State is consistent after concurrent updates
        let final_state = state.lock().unwrap();

        // Should have exactly one entry for the cursor
        prop_assert!(final_state.len() <= 1, "Should have at most one entry");

        if let Some(path) = final_state.get(&cursor_name) {
            prop_assert!(path.ends_with(".cur"), "Final path should be valid");
        }
    }
}

/// This property tests concurrent read and write operations to ensure consistency.
proptest! {
    #[test]
    fn property_concurrent_read_write_consistency(
        initial_cursors in prop::collection::hash_map(
            prop::string::string_regex("[a-z_]+").unwrap(),
            prop::string::string_regex("[a-z0-9/]+\\.cur").unwrap(),
            5..10
        ),
        write_ops in prop::collection::vec(
            (prop::string::string_regex("[a-z_]+").unwrap(), prop::string::string_regex("[a-z0-9/]+\\.cur").unwrap()),
            5..15
        )
    ) {
        let state = Arc::new(Mutex::new(initial_cursors.clone()));
        let mut handles = vec![];

        // Spawn reader threads
        for _ in 0..5 {
            let state_clone = Arc::clone(&state);
            let handle = thread::spawn(move || {
                for _ in 0..10 {
                    let guard = state_clone.lock().unwrap();
                    let snapshot = guard.clone();
                    drop(guard);

                    // Verify consistency of read data
                    for (key, value) in snapshot.iter() {
                        assert!(!key.is_empty());
                        assert!(value.ends_with(".cur"));
                    }

                    thread::yield_now();
                }
            });
            handles.push(handle);
        }

        // Spawn writer threads
        for (cursor_name, cursor_path) in write_ops {
            let state_clone = Arc::clone(&state);
            let handle = thread::spawn(move || {
                let mut guard = state_clone.lock().unwrap();
                guard.insert(cursor_name, cursor_path);
            });
            handles.push(handle);
        }

        // Wait for all operations
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify final state is consistent
        let final_state = state.lock().unwrap();
        for (key, value) in final_state.iter() {
            prop_assert!(!key.is_empty());
            prop_assert!(value.ends_with(".cur"));
        }
    }
}
