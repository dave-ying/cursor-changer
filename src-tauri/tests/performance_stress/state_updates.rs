use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

#[test]
fn test_stress_rapid_state_updates() {
    let num_threads = 15;
    let updates_per_thread = 200;
    let state = Arc::new(Mutex::new(HashMap::<String, i32>::new()));
    let mut handles = vec![];

    {
        let mut s = state.lock().unwrap();
        for i in 0..10 {
            s.insert(format!("counter_{}", i), 0);
        }
    }

    crate::test_log!(
        "Starting state update stress test: {} threads, {} updates each",
        num_threads,
        updates_per_thread
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

    crate::test_log!("Completed {} state updates in {:?}", total_updates, elapsed);
    crate::test_log!("Throughput: {:.2} updates/second", updates_per_sec);

    // Verify all updates were applied
    let final_state = state.lock().unwrap();
    let total_count: i32 = final_state.values().sum();
    assert_eq!(
        total_count, total_updates as i32,
        "All updates should be applied"
    );
}
