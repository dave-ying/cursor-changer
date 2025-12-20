use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

#[test]
fn test_stress_sustained_high_load() {
    let duration = Duration::from_secs(30);
    let operation_count = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];
    let start_time = Instant::now();

    crate::test_log!("Starting sustained high load test (30 seconds)...");

    for worker_type in 0..4 {
        let count_clone = Arc::clone(&operation_count);
        let start_clone = start_time;

        let handle = thread::spawn(move || {
            while start_clone.elapsed() < duration {
                match worker_type {
                    0 => {
                        let mut sum = 0u64;
                        for i in 0..1000 {
                            sum = sum.wrapping_add(i);
                        }
                        assert!(sum > 0);
                    }
                    1 => {
                        let buffer = vec![0u8; 1024];
                        assert_eq!(buffer.len(), 1024);
                        drop(buffer);
                    }
                    2 => {
                        let mut map = std::collections::HashMap::new();
                        for i in 0..10 {
                            map.insert(i, i * 2);
                        }
                        assert_eq!(map.len(), 10);
                    }
                    _ => {
                        thread::yield_now();
                    }
                }

                count_clone.fetch_add(1, Ordering::SeqCst);
                thread::yield_now();
            }
        });

        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let elapsed = start_time.elapsed();
    let total_ops = operation_count.load(Ordering::SeqCst);
    let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

    crate::test_log!("Sustained {} operations over {:?}", total_ops, elapsed);
    crate::test_log!("Average throughput: {:.2} operations/second", ops_per_sec);

    assert!(total_ops > 0, "Should have completed operations");
}
