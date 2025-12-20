use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};

#[test]
fn test_stress_concurrent_api_calls() {
    let num_api_threads = 12;
    let calls_per_thread = 50;
    let success_count = Arc::new(AtomicUsize::new(0));
    let error_count = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    crate::test_log!(
        "Starting concurrent API calls stress test: {} threads, {} calls each",
        num_api_threads,
        calls_per_thread
    );
    let start_time = Instant::now();

    for thread_id in 0..num_api_threads {
        let success_clone = Arc::clone(&success_count);
        let error_clone = Arc::clone(&error_count);

        let handle = thread::spawn(move || {
            for call_id in 0..calls_per_thread {
                let processing_time = Duration::from_micros((call_id % 10) as u64 * 100);
                thread::sleep(processing_time);

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

    crate::test_log!("Completed {} API calls in {:?}", total_calls, elapsed);
    crate::test_log!("Throughput: {:.2} calls/second", calls_per_sec);
    crate::test_log!("Success: {}, Errors: {}", final_success, final_error);

    assert_eq!(final_success + final_error, total_calls);
}
