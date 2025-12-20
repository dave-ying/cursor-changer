use cursor_changer_tauri::cursor_converter::generate_cur_data;
use image::{ImageBuffer, Rgba};
use std::collections::HashMap;
use std::fs;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Instant;
use tempfile::TempDir;

#[test]
fn test_stress_resource_contention_mixed_operations() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let num_threads = 8;
    let operations_per_thread = 30;
    let state = Arc::new(Mutex::new(HashMap::<String, String>::new()));
    let mut handles = vec![];

    crate::test_log!(
        "Starting mixed operations stress test: {} threads, {} operations each",
        num_threads,
        operations_per_thread
    );
    let start_time = Instant::now();

    for thread_id in 0..num_threads {
        let state_clone = Arc::clone(&state);
        let temp_path = temp_dir.path().to_path_buf();

        let handle = thread::spawn(move || {
            for op_id in 0..operations_per_thread {
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

                let file_path = temp_path.join(format!("temp_{}_{}.dat", thread_id, op_id));
                let data = vec![0u8; 1024];
                fs::write(&file_path, &data).expect("Failed to write");
                let _ = fs::read(&file_path).expect("Failed to read");
                fs::remove_file(&file_path).expect("Failed to remove");
                drop(data);

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
    let total_ops = num_threads * operations_per_thread * 3;
    let ops_per_sec = total_ops as f64 / elapsed.as_secs_f64();

    crate::test_log!("Completed {} mixed operations in {:?}", total_ops, elapsed);
    crate::test_log!("Throughput: {:.2} operations/second", ops_per_sec);

    let final_state = state.lock().unwrap();
    assert!(!final_state.is_empty());
}
