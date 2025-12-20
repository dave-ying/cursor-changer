use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
/// Unit Tests for Concurrency Mechanisms
///
/// These tests validate the correctness of concurrency primitives and patterns
/// used throughout the application.
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

/// Test that mutex usage prevents data races
#[test]
fn test_mutex_prevents_data_races() {
    let data = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let data_clone = Arc::clone(&data);
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                let mut guard = data_clone.lock().unwrap();
                *guard += 1;
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let final_value = *data.lock().unwrap();
    assert_eq!(final_value, 1000, "Mutex should prevent data races");
}

/// Test that lock ordering prevents deadlocks
#[test]
fn test_lock_ordering_prevents_deadlock() {
    let lock_a = Arc::new(Mutex::new(0));
    let lock_b = Arc::new(Mutex::new(0));

    let lock_a_clone = Arc::clone(&lock_a);
    let lock_b_clone = Arc::clone(&lock_b);

    // Thread 1: Always acquire lock_a then lock_b
    let handle1 = thread::spawn(move || {
        for _ in 0..10 {
            let _guard_a = lock_a_clone.lock().unwrap();
            thread::sleep(Duration::from_millis(1));
            let _guard_b = lock_b_clone.lock().unwrap();
            // Do work
        }
    });

    let lock_a_clone2 = Arc::clone(&lock_a);
    let lock_b_clone2 = Arc::clone(&lock_b);

    // Thread 2: Also acquire lock_a then lock_b (same order)
    let handle2 = thread::spawn(move || {
        for _ in 0..10 {
            let _guard_a = lock_a_clone2.lock().unwrap();
            thread::sleep(Duration::from_millis(1));
            let _guard_b = lock_b_clone2.lock().unwrap();
            // Do work
        }
    });

    // Should complete without deadlock
    handle1.join().unwrap();
    handle2.join().unwrap();
}

/// Test that atomic operations work correctly
#[test]
fn test_atomic_operations() {
    let flag = Arc::new(AtomicBool::new(false));
    let flag_clone = Arc::clone(&flag);

    let handle = thread::spawn(move || {
        thread::sleep(Duration::from_millis(10));
        flag_clone.store(true, Ordering::SeqCst);
    });

    // Wait for flag to be set
    while !flag.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();
    assert!(flag.load(Ordering::SeqCst), "Flag should be set");
}

/// Test that Arc allows shared ownership
#[test]
fn test_arc_shared_ownership() {
    let data = Arc::new(vec![1, 2, 3, 4, 5]);
    let mut handles = vec![];

    for _ in 0..5 {
        let data_clone = Arc::clone(&data);
        let handle = thread::spawn(move || {
            let sum: i32 = data_clone.iter().sum();
            sum
        });
        handles.push(handle);
    }

    for handle in handles {
        let result = handle.join().unwrap();
        assert_eq!(result, 15, "Each thread should see the same data");
    }
}

/// Test that mutex guards are properly dropped
#[test]
fn test_mutex_guard_drop() {
    let data = Arc::new(Mutex::new(0));

    {
        let mut guard = data.lock().unwrap();
        *guard = 42;
        // Guard is dropped here
    }

    // Should be able to acquire lock again
    let guard = data.lock().unwrap();
    assert_eq!(*guard, 42);
}

/// Test concurrent reads with Arc
#[test]
fn test_concurrent_reads() {
    let data = Arc::new(vec![1, 2, 3, 4, 5]);
    let mut handles = vec![];

    for i in 0..10 {
        let data_clone = Arc::clone(&data);
        let handle = thread::spawn(move || {
            thread::sleep(Duration::from_millis(i * 2));
            data_clone.len()
        });
        handles.push(handle);
    }

    for handle in handles {
        let len = handle.join().unwrap();
        assert_eq!(len, 5, "All threads should see the same length");
    }
}

/// Test that mutex poisoning is handled
#[test]
fn test_mutex_poisoning_detection() {
    let data = Arc::new(Mutex::new(0));
    let data_clone = Arc::clone(&data);

    // Create a thread that panics while holding the lock
    let handle = thread::spawn(move || {
        let _guard = data_clone.lock().unwrap();
        panic!("Intentional panic to poison mutex");
    });

    // Thread should panic
    assert!(handle.join().is_err());

    // Mutex should be poisoned
    let result = data.lock();
    assert!(result.is_err(), "Mutex should be poisoned after panic");
}

/// Test thread-safe counter increment
#[test]
fn test_thread_safe_counter() {
    let counter = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                counter_clone.fetch_add(1, Ordering::SeqCst);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    assert_eq!(counter.load(Ordering::SeqCst), 1000);
}

/// Test that channels work for message passing
#[test]
fn test_channel_message_passing() {
    use std::sync::mpsc;

    let (tx, rx) = mpsc::channel();
    let mut handles = vec![];

    for i in 0..5 {
        let tx_clone = tx.clone();
        let handle = thread::spawn(move || {
            tx_clone.send(i).unwrap();
        });
        handles.push(handle);
    }

    drop(tx); // Drop original sender

    for handle in handles {
        handle.join().unwrap();
    }

    let mut received = vec![];
    while let Ok(value) = rx.recv() {
        received.push(value);
    }

    assert_eq!(received.len(), 5);
    received.sort();
    assert_eq!(received, vec![0, 1, 2, 3, 4]);
}

/// Test barrier synchronization
#[test]
fn test_barrier_synchronization() {
    use std::sync::Barrier;

    let barrier = Arc::new(Barrier::new(5));
    let counter = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    for _ in 0..5 {
        let barrier_clone = Arc::clone(&barrier);
        let counter_clone = Arc::clone(&counter);

        let handle = thread::spawn(move || {
            // Do some work
            thread::sleep(Duration::from_millis(10));

            // Wait at barrier
            barrier_clone.wait();

            // All threads proceed together
            counter_clone.fetch_add(1, Ordering::SeqCst);
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    assert_eq!(counter.load(Ordering::SeqCst), 5);
}
