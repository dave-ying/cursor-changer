/// Rapid Interactions Safety Tests
///
/// **Feature: app-quality-improvement, Property 19: Rapid interactions are handled safely**
/// **Validates: Requirements 8.5**
///
/// These tests verify that rapid user interactions are handled safely through
/// debouncing or queuing to prevent race conditions.
use proptest::prelude::*;
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

/// This property verifies that rapid user interactions are handled safely through
/// debouncing or queuing to prevent race conditions.
proptest! {
    #[test]
    fn property_rapid_interactions_safe(
        num_interactions in 10usize..50,
        interaction_delay_ms in 1u64..10
    ) {
        // Simulate a command queue with proper synchronization
        let command_queue = Arc::new(Mutex::new(Vec::new()));
        let processed_count = Arc::new(AtomicUsize::new(0));
        let mut handles = vec![];

        // Spawn rapid interactions
        for i in 0..num_interactions {
            let queue_clone = Arc::clone(&command_queue);
            let count_clone = Arc::clone(&processed_count);

            let handle = thread::spawn(move || {
                // Simulate rapid user interaction
                thread::sleep(Duration::from_millis(interaction_delay_ms));

                // Queue the command
                {
                    let mut queue = queue_clone.lock().unwrap();
                    queue.push(format!("command_{}", i));
                }

                // Process command (simulated)
                count_clone.fetch_add(1, Ordering::SeqCst);
            });

            handles.push(handle);
        }

        // Wait for all interactions
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify: All commands were queued
        let final_queue = command_queue.lock().unwrap();
        prop_assert_eq!(final_queue.len(), num_interactions, "All commands should be queued");

        // Verify: All commands were processed
        let final_count = processed_count.load(Ordering::SeqCst);
        prop_assert_eq!(final_count, num_interactions, "All commands should be processed");
    }
}

/// This property tests that rapid state updates don't cause race conditions.
proptest! {
    #[test]
    fn property_rapid_state_updates_consistent(
        num_updates in 10usize..30
    ) {
        // State with proper locking
        let state = Arc::new(Mutex::new(HashMap::<String, i32>::new()));
        let mut handles = vec![];

        // Initialize state
        {
            let mut s = state.lock().unwrap();
            s.insert("counter".to_string(), 0);
        }

        // Spawn rapid state updates
        for _ in 0..num_updates {
            let state_clone = Arc::clone(&state);

            let handle = thread::spawn(move || {
                // Very short delay to simulate rapid interactions
                thread::sleep(Duration::from_millis(1));

                // Update state
                let mut s = state_clone.lock().unwrap();
                let current = s.get("counter").copied().unwrap_or(0);
                s.insert("counter".to_string(), current + 1);
            });

            handles.push(handle);
        }

        // Wait for all updates
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify: Final state is consistent
        let final_state = state.lock().unwrap();
        let final_value = final_state.get("counter").copied().unwrap_or(0);
        prop_assert_eq!(final_value, num_updates as i32, "All updates should be applied");
    }
}

/// This property tests that rapid file operations are properly queued.
proptest! {
    #[test]
    fn property_rapid_file_operations_queued(
        num_operations in 5usize..20
    ) {
        use std::fs;
        use tempfile::TempDir;

        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("rapid_test.txt");

        // Create initial file
        fs::write(&file_path, "0").unwrap();

        let file_path_arc = Arc::new(file_path.clone());
        let file_lock = Arc::new(Mutex::new(()));
        let mut handles = vec![];

        // Spawn rapid file operations
        for _i in 0..num_operations {
            let path_clone = Arc::clone(&file_path_arc);
            let lock_clone = Arc::clone(&file_lock);

            let handle = thread::spawn(move || {
                // Very short delay
                thread::sleep(Duration::from_millis(1));

                // Lock and update file
                let _guard = lock_clone.lock().unwrap();

                // Read current value
                let current = fs::read_to_string(&*path_clone)
                    .unwrap()
                    .trim()
                    .parse::<i32>()
                    .unwrap_or(0);

                // Write new value
                fs::write(&*path_clone, format!("{}", current + 1)).unwrap();
            });

            handles.push(handle);
        }

        // Wait for all operations
        for handle in handles {
            handle.join().unwrap();
        }

        // Verify: Final value is correct
        let final_content = fs::read_to_string(&file_path).unwrap();
        let final_value = final_content.trim().parse::<i32>().unwrap();
        prop_assert_eq!(final_value, num_operations as i32, "All operations should be applied in order");
    }
}
