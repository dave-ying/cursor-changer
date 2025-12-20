use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;

#[test]
fn test_stress_rapid_user_interactions() {
    let num_interaction_threads = 10;
    let interactions_per_thread = 100;
    let command_queue = Arc::new(Mutex::new(Vec::new()));
    let processed_count = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    crate::test_log!(
        "Starting rapid user interaction stress test: {} threads, {} interactions each",
        num_interaction_threads,
        interactions_per_thread
    );
    let start_time = Instant::now();

    for thread_id in 0..num_interaction_threads {
        let queue_clone = Arc::clone(&command_queue);
        let count_clone = Arc::clone(&processed_count);

        let handle = thread::spawn(move || {
            for interaction_id in 0..interactions_per_thread {
                let command = format!("interaction_{}_{}", thread_id, interaction_id);

                {
                    let mut queue = queue_clone.lock().unwrap();
                    queue.push(command);
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
    let total_interactions = num_interaction_threads * interactions_per_thread;
    let interactions_per_sec = total_interactions as f64 / elapsed.as_secs_f64();

    crate::test_log!(
        "Completed {} interactions in {:?}",
        total_interactions,
        elapsed
    );
    crate::test_log!(
        "Throughput: {:.2} interactions/second",
        interactions_per_sec
    );

    let final_queue = command_queue.lock().unwrap();
    let final_count = processed_count.load(Ordering::SeqCst);

    assert_eq!(final_queue.len(), total_interactions);
    assert_eq!(final_count, total_interactions);
}
