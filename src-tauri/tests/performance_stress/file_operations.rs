use std::fs;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;
use tempfile::TempDir;

#[test]
fn test_stress_rapid_concurrent_file_operations() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let num_threads = 10;
    let operations_per_thread = 50;
    let file_lock = Arc::new(Mutex::new(()));
    let mut handles = vec![];

    crate::test_log!(
        "Starting file operations stress test: {} threads, {} operations each",
        num_threads,
        operations_per_thread
    );
    let start_time = Instant::now();

    for thread_id in 0..num_threads {
        let temp_path = temp_dir.path().to_path_buf();
        let lock_clone = Arc::clone(&file_lock);

        let handle = thread::spawn(move || {
            for op_id in 0..operations_per_thread {
                let file_path = temp_path.join(format!("file_{}_{}.txt", thread_id, op_id));

                {
                    let _guard = lock_clone.lock().unwrap();
                    let data = format!("data from thread {} operation {}", thread_id, op_id);
                    fs::write(&file_path, data.as_bytes()).expect("Failed to write");
                }

                let content = fs::read_to_string(&file_path).expect("Failed to read");
                assert!(!content.is_empty());

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
    let total_ops = num_threads * operations_per_thread * 3;
    let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

    crate::test_log!("Completed {} file operations in {:?}", total_ops, elapsed);
    crate::test_log!("Throughput: {:.2} operations/second", ops_per_sec);
}
