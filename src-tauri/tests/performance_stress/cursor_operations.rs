use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

#[test]
fn test_stress_rapid_concurrent_cursor_operations() {
    let num_threads = 20;
    let operations_per_thread = 100;
    let state = Arc::new(Mutex::new(HashMap::<String, String>::new()));
    let mut handles = vec![];

    crate::test_log!(
        "Starting stress test: {} threads, {} operations each",
        num_threads,
        operations_per_thread
    );
    let start_time = Instant::now();

    for thread_id in 0..num_threads {
        let state_clone = Arc::clone(&state);

        let handle = thread::spawn(move || {
            for op_id in 0..operations_per_thread {
                let cursor_name = format!("cursor_{}_{}", thread_id, op_id % 10);
                let cursor_path = format!("/path/to/cursor_{}_{}.cur", thread_id, op_id);

                let mut guard = state_clone.lock().unwrap();
                guard.insert(cursor_name, cursor_path);
                drop(guard);

                thread::yield_now();
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let elapsed = start_time.elapsed();
    let total_ops = num_threads * operations_per_thread;
    let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

    crate::test_log!("Completed {} operations in {:?}", total_ops, elapsed);
    crate::test_log!("Throughput: {:.2} operations/second", ops_per_sec);

    let final_state = state.lock().unwrap();
    assert!(!final_state.is_empty(), "State should have entries");

    for (key, value) in final_state.iter() {
        assert!(!key.is_empty());
        assert!(value.ends_with(".cur"));
    }
}
