#[macro_use]
mod test_support;

#[path = "performance_stress/mod.rs"]
mod performance_stress;

#[cfg(any())]
mod _legacy_performance_stress_concurrent_tests {
    use std::collections::HashMap;
    use std::fs;
    /// Performance stress tests for concurrent operations
    ///
    /// These tests simulate high-load scenarios with rapid user interactions,
    /// concurrent API calls, and resource contention to verify system stability.
    ///
    /// **Validates: Requirements 8.5**
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::{Duration, Instant};
    use tempfile::TempDir;

    /// Test rapid concurrent cursor operations
    /// Simulates many users performing cursor operations simultaneously
    #[test]
    fn test_stress_rapid_concurrent_cursor_operations() {
        let num_threads = 20;
        let operations_per_thread = 100;
        let state = Arc::new(Mutex::new(HashMap::<String, String>::new()));
        let mut handles = vec![];

        println!(
            "Starting stress test: {} threads, {} operations each",
            num_threads, operations_per_thread
        );
        let start_time = Instant::now();

        for thread_id in 0..num_threads {
            let state_clone = Arc::clone(&state);

            let handle = thread::spawn(move || {
                for op_id in 0..operations_per_thread {
                    let cursor_name = format!("cursor_{}_{}", thread_id, op_id % 10);
                    let cursor_path = format!("/path/to/cursor_{}_{}.cur", thread_id, op_id);

                    // Acquire lock and update state
                    let mut guard = state_clone.lock().unwrap();
                    guard.insert(cursor_name, cursor_path);
                    drop(guard);

                    // Minimal delay to increase contention
                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        // Wait for all threads
        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let total_ops = num_threads * operations_per_thread;
        let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

        println!("Completed {} operations in {:?}", total_ops, elapsed);
        println!("Throughput: {:.2} operations/second", ops_per_sec);

        // Verify state is consistent
        let final_state = state.lock().unwrap();
        assert!(final_state.len() > 0, "State should have entries");

        for (key, value) in final_state.iter() {
            assert!(!key.is_empty());
            assert!(value.ends_with(".cur"));
        }
    }

    /// Test rapid concurrent file operations
    /// Simulates high-load file system access patterns
    #[test]
    fn test_stress_rapid_concurrent_file_operations() {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let num_threads = 10;
        let operations_per_thread = 50;
        let file_lock = Arc::new(Mutex::new(()));
        let mut handles = vec![];

        println!(
            "Starting file operations stress test: {} threads, {} operations each",
            num_threads, operations_per_thread
        );
        let start_time = Instant::now();

        for thread_id in 0..num_threads {
            let temp_path = temp_dir.path().to_path_buf();
            let lock_clone = Arc::clone(&file_lock);

            let handle = thread::spawn(move || {
                for op_id in 0..operations_per_thread {
                    let file_path = temp_path.join(format!("file_{}_{}.txt", thread_id, op_id));

                    // Write operation with locking
                    {
                        let _guard = lock_clone.lock().unwrap();
                        let data = format!("data from thread {} operation {}", thread_id, op_id);
                        fs::write(&file_path, data.as_bytes()).expect("Failed to write");
                    }

                    // Read operation
                    let content = fs::read_to_string(&file_path).expect("Failed to read");
                    assert!(!content.is_empty());

                    // Delete operation with locking
                    {
                        let _guard = lock_clone.lock().unwrap();
                        fs::remove_file(&file_path).expect("Failed to remove");
                    }

                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let total_ops = num_threads * operations_per_thread * 3; // write, read, delete
        let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

        println!("Completed {} file operations in {:?}", total_ops, elapsed);
        println!("Throughput: {:.2} operations/second", ops_per_sec);
    }

    /// Test rapid state updates with high contention
    /// Simulates many concurrent state modifications
    #[test]
    fn test_stress_rapid_state_updates() {
        let num_threads = 15;
        let updates_per_thread = 200;
        let state = Arc::new(Mutex::new(HashMap::<String, i32>::new()));
        let mut handles = vec![];

        // Initialize counters
        {
            let mut s = state.lock().unwrap();
            for i in 0..10 {
                s.insert(format!("counter_{}", i), 0);
            }
        }

        println!(
            "Starting state update stress test: {} threads, {} updates each",
            num_threads, updates_per_thread
        );
        let start_time = Instant::now();

        for thread_id in 0..num_threads {
            let state_clone = Arc::clone(&state);

            let handle = thread::spawn(move || {
                for op_id in 0..updates_per_thread {
                    let key = format!("counter_{}", op_id % 10);

                    let mut s = state_clone.lock().unwrap();
                    let current = s.get(&key).copied().unwrap_or(0);
                    s.insert(key, current + 1);
                    drop(s);

                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let total_updates = num_threads * updates_per_thread;
        let updates_per_sec = total_updates as f64 / elapsed.as_secs_f64();

        println!("Completed {} state updates in {:?}", total_updates, elapsed);
        println!("Throughput: {:.2} updates/second", updates_per_sec);

        // Verify all updates were applied
        let final_state = state.lock().unwrap();
        let total_count: i32 = final_state.values().sum();
        assert_eq!(
            total_count, total_updates as i32,
            "All updates should be applied"
        );
    }

    /// Test resource contention with mixed operations
    /// Simulates realistic workload with various operation types
    #[test]
    fn test_stress_resource_contention_mixed_operations() {
        use cursor_changer_tauri::cursor_converter::generate_cur_data;
        use image::{ImageBuffer, Rgba};

        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let num_threads = 8;
        let operations_per_thread = 30;
        let state = Arc::new(Mutex::new(HashMap::<String, String>::new()));
        let mut handles = vec![];

        println!(
            "Starting mixed operations stress test: {} threads, {} operations each",
            num_threads, operations_per_thread
        );
        let start_time = Instant::now();

        for thread_id in 0..num_threads {
            let state_clone = Arc::clone(&state);
            let temp_path = temp_dir.path().to_path_buf();

            let handle = thread::spawn(move || {
                for op_id in 0..operations_per_thread {
                    // Operation 1: Cursor conversion (CPU intensive)
                    let size = 32 + (op_id % 32);
                    let image = ImageBuffer::from_fn(size, size, |x, y| {
                        Rgba([
                            ((x + thread_id as u32) % 256) as u8,
                            ((y + op_id as u32) % 256) as u8,
                            255,
                            255,
                        ])
                    });
                    let hotspot = (size / 2) as u16;
                    let result = generate_cur_data(&image, hotspot, hotspot);
                    assert!(result.is_ok());
                    drop(result);
                    drop(image);

                    // Operation 2: File I/O
                    let file_path = temp_path.join(format!("temp_{}_{}.dat", thread_id, op_id));
                    let data = vec![0u8; 1024];
                    fs::write(&file_path, &data).expect("Failed to write");
                    let _ = fs::read(&file_path).expect("Failed to read");
                    fs::remove_file(&file_path).expect("Failed to remove");
                    drop(data);

                    // Operation 3: State update
                    let mut s = state_clone.lock().unwrap();
                    s.insert(
                        format!("key_{}_{}", thread_id, op_id % 5),
                        format!("value_{}_{}", thread_id, op_id),
                    );
                    drop(s);

                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let total_ops = num_threads * operations_per_thread * 3; // 3 operation types
        let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

        println!("Completed {} mixed operations in {:?}", total_ops, elapsed);
        println!("Throughput: {:.2} operations/second", ops_per_sec);

        // Verify state consistency
        let final_state = state.lock().unwrap();
        assert!(final_state.len() > 0);
    }

    /// Test rapid user interaction simulation
    /// Simulates clicking, typing, and other UI interactions at high speed
    #[test]
    fn test_stress_rapid_user_interactions() {
        use std::sync::atomic::{AtomicUsize, Ordering};

        let num_interaction_threads = 10;
        let interactions_per_thread = 100;
        let command_queue = Arc::new(Mutex::new(Vec::new()));
        let processed_count = Arc::new(AtomicUsize::new(0));
        let mut handles = vec![];

        println!(
            "Starting rapid user interaction stress test: {} threads, {} interactions each",
            num_interaction_threads, interactions_per_thread
        );
        let start_time = Instant::now();

        for thread_id in 0..num_interaction_threads {
            let queue_clone = Arc::clone(&command_queue);
            let count_clone = Arc::clone(&processed_count);

            let handle = thread::spawn(move || {
                for interaction_id in 0..interactions_per_thread {
                    // Simulate rapid interaction (no delay)
                    let command = format!("interaction_{}_{}", thread_id, interaction_id);

                    // Queue command
                    {
                        let mut queue = queue_clone.lock().unwrap();
                        queue.push(command);
                    }

                    // Process command
                    count_clone.fetch_add(1, Ordering::SeqCst);

                    // Yield to increase contention
                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let total_interactions = num_interaction_threads * interactions_per_thread;
        let interactions_per_sec = total_interactions as f64 / elapsed.as_secs_f64();

        println!(
            "Completed {} interactions in {:?}",
            total_interactions, elapsed
        );
        println!(
            "Throughput: {:.2} interactions/second",
            interactions_per_sec
        );

        // Verify all interactions were processed
        let final_queue = command_queue.lock().unwrap();
        let final_count = processed_count.load(Ordering::SeqCst);

        assert_eq!(final_queue.len(), total_interactions);
        assert_eq!(final_count, total_interactions);
    }

    /// Test concurrent API calls with varying response times
    /// Simulates multiple API calls happening simultaneously
    #[test]
    fn test_stress_concurrent_api_calls() {
        use std::sync::atomic::{AtomicUsize, Ordering};

        let num_api_threads = 12;
        let calls_per_thread = 50;
        let success_count = Arc::new(AtomicUsize::new(0));
        let error_count = Arc::new(AtomicUsize::new(0));
        let mut handles = vec![];

        println!(
            "Starting concurrent API calls stress test: {} threads, {} calls each",
            num_api_threads, calls_per_thread
        );
        let start_time = Instant::now();

        for thread_id in 0..num_api_threads {
            let success_clone = Arc::clone(&success_count);
            let error_clone = Arc::clone(&error_count);

            let handle = thread::spawn(move || {
                for call_id in 0..calls_per_thread {
                    // Simulate API call with varying processing time
                    let processing_time = Duration::from_micros((call_id % 10) as u64 * 100);
                    thread::sleep(processing_time);

                    // Simulate success/error (90% success rate)
                    if (thread_id + call_id) % 10 != 0 {
                        success_clone.fetch_add(1, Ordering::SeqCst);
                    } else {
                        error_clone.fetch_add(1, Ordering::SeqCst);
                    }

                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let total_calls = num_api_threads * calls_per_thread;
        let calls_per_sec = total_calls as f64 / elapsed.as_secs_f64();

        let final_success = success_count.load(Ordering::SeqCst);
        let final_error = error_count.load(Ordering::SeqCst);

        println!("Completed {} API calls in {:?}", total_calls, elapsed);
        println!("Throughput: {:.2} calls/second", calls_per_sec);
        println!("Success: {}, Errors: {}", final_success, final_error);

        assert_eq!(final_success + final_error, total_calls);
    }

    /// Test system stability under sustained high load
    /// Runs multiple stress scenarios simultaneously
    #[test]
    fn test_stress_sustained_high_load() {
        use std::sync::atomic::{AtomicUsize, Ordering};

        let duration = Duration::from_secs(30); // 30 seconds of sustained load
        let operation_count = Arc::new(AtomicUsize::new(0));
        let mut handles = vec![];
        let start_time = Instant::now();

        println!("Starting sustained high load test (30 seconds)...");

        // Spawn multiple types of workers
        for worker_type in 0..4 {
            let count_clone = Arc::clone(&operation_count);
            let start_clone = start_time;

            let handle = thread::spawn(move || {
                while start_clone.elapsed() < duration {
                    match worker_type {
                        0 => {
                            // CPU-intensive work
                            let mut sum = 0u64;
                            for i in 0..1000 {
                                sum = sum.wrapping_add(i);
                            }
                            assert!(sum > 0);
                        }
                        1 => {
                            // Memory allocation
                            let buffer = vec![0u8; 1024];
                            assert_eq!(buffer.len(), 1024);
                            drop(buffer);
                        }
                        2 => {
                            // State updates
                            let mut map = HashMap::new();
                            for i in 0..10 {
                                map.insert(i, i * 2);
                            }
                            assert_eq!(map.len(), 10);
                        }
                        _ => {
                            // Mixed operations
                            thread::yield_now();
                        }
                    }

                    count_clone.fetch_add(1, Ordering::SeqCst);
                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        // Wait for all workers
        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let total_ops = operation_count.load(Ordering::SeqCst);
        let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

        println!("Sustained {} operations over {:?}", total_ops, elapsed);
        println!("Average throughput: {:.2} operations/second", ops_per_sec);

        assert!(total_ops > 0, "Should have completed operations");
    }

    /// Test deadlock prevention under high contention
    /// Verifies that lock ordering prevents deadlocks
    #[test]
    fn test_stress_deadlock_prevention() {
        let lock_a = Arc::new(Mutex::new(0));
        let lock_b = Arc::new(Mutex::new(0));
        let num_threads = 10;
        let operations_per_thread = 50;
        let mut handles = vec![];

        println!(
            "Starting deadlock prevention stress test: {} threads, {} operations each",
            num_threads, operations_per_thread
        );
        let start_time = Instant::now();

        for thread_id in 0..num_threads {
            let lock_a_clone = Arc::clone(&lock_a);
            let lock_b_clone = Arc::clone(&lock_b);

            let handle = thread::spawn(move || {
                for _ in 0..operations_per_thread {
                    // Always acquire locks in the same order (A then B)
                    let mut guard_a = lock_a_clone.lock().unwrap();
                    *guard_a += 1;

                    // Small delay to increase contention
                    thread::yield_now();

                    let mut guard_b = lock_b_clone.lock().unwrap();
                    *guard_b += 1;

                    drop(guard_b);
                    drop(guard_a);

                    thread::yield_now();
                }
            });

            handles.push(handle);
        }

        // Should complete without deadlock
        for handle in handles {
            handle.join().unwrap();
        }

        let elapsed = start_time.elapsed();
        let expected_count = (num_threads * operations_per_thread) as i32;

        let final_a = *lock_a.lock().unwrap();
        let final_b = *lock_b.lock().unwrap();

        println!("Completed in {:?} without deadlock", elapsed);
        println!("Lock A count: {}, Lock B count: {}", final_a, final_b);

        assert_eq!(final_a, expected_count);
        assert_eq!(final_b, expected_count);
    }
}
