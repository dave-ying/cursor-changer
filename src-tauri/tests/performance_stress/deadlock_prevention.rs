use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

#[test]
fn test_stress_deadlock_prevention() {
    let lock_a = Arc::new(Mutex::new(0));
    let lock_b = Arc::new(Mutex::new(0));
    let num_threads = 10;
    let operations_per_thread = 50;
    let mut handles = vec![];

    crate::test_log!(
        "Starting deadlock prevention stress test: {} threads, {} operations each",
        num_threads,
        operations_per_thread
    );
    let start_time = Instant::now();

    for _thread_id in 0..num_threads {
        let lock_a_clone = Arc::clone(&lock_a);
        let lock_b_clone = Arc::clone(&lock_b);

        let handle = thread::spawn(move || {
            for _ in 0..operations_per_thread {
                let mut guard_a = lock_a_clone.lock().unwrap();
                *guard_a += 1;

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

    for handle in handles {
        handle.join().unwrap();
    }

    let elapsed = start_time.elapsed();
    let expected_count = (num_threads * operations_per_thread) as i32;

    let final_a = *lock_a.lock().unwrap();
    let final_b = *lock_b.lock().unwrap();

    crate::test_log!("Completed in {:?} without deadlock", elapsed);
    crate::test_log!("Lock A count: {}, Lock B count: {}", final_a, final_b);

    assert_eq!(final_a, expected_count);
    assert_eq!(final_b, expected_count);
}
