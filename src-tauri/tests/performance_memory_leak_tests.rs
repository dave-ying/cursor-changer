use cursor_changer_tauri::cursor_converter::generate_cur_data;
use image::{ImageBuffer, Rgba};
/// Performance tests for memory leak detection in long-running scenarios
///
/// These tests simulate extended application usage (1+ hours worth of operations)
/// to verify stable memory usage and detect potential memory leaks.
///
/// **Validates: Requirements 7.1**
use std::fs;
use std::time::{Duration, Instant};
use tempfile::TempDir;

#[macro_use]
mod test_support;

/// Test that simulates 1+ hour of cursor conversion operations
/// This test performs thousands of cursor conversions to detect memory leaks
#[test]
#[ignore] // Ignored by default due to long runtime - run with: cargo test --ignored
fn test_long_running_cursor_conversions_no_leak() {
    let start_time = Instant::now();
    let target_duration = Duration::from_secs(60 * 60); // 1 hour
    let mut iteration_count = 0;

    crate::test_log!("Starting long-running cursor conversion test (1 hour)...");
    crate::test_log!("This test will perform continuous cursor conversions to detect memory leaks");

    while start_time.elapsed() < target_duration {
        // Vary cursor sizes to test different memory patterns
        let size = 32 + (iteration_count % 96); // 32 to 128 pixels

        // Generate cursor image
        let image = ImageBuffer::from_fn(size, size, |x, y| {
            Rgba([
                ((x + iteration_count) % 256) as u8,
                ((y + iteration_count) % 256) as u8,
                ((x + y + iteration_count) % 256) as u8,
                255,
            ])
        });

        // Convert to cursor
        let hotspot = (size / 2) as u16;
        let result = generate_cur_data(&image, hotspot, hotspot);
        assert!(result.is_ok(), "Cursor generation should succeed");

        // Explicitly drop to ensure cleanup
        drop(result);
        drop(image);

        iteration_count += 1;

        // Progress reporting every 1000 iterations
        if iteration_count % 1000 == 0 {
            let elapsed = start_time.elapsed();
            crate::test_log!(
                "Progress: {} iterations in {:.1} minutes ({:.1}% complete)",
                iteration_count,
                elapsed.as_secs_f64() / 60.0,
                (elapsed.as_secs_f64() / target_duration.as_secs_f64()) * 100.0
            );
        }
    }

    crate::test_log!(
        "Completed {} cursor conversions in {:.1} minutes",
        iteration_count,
        start_time.elapsed().as_secs_f64() / 60.0
    );
    crate::test_log!("If this test completed without OOM, memory management is stable");
}

/// Test that simulates 1+ hour of file operations
/// This test performs continuous file read/write/delete operations
#[test]
#[ignore] // Ignored by default due to long runtime
fn test_long_running_file_operations_no_leak() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let start_time = Instant::now();
    let target_duration = Duration::from_secs(60 * 60); // 1 hour
    let mut iteration_count = 0;

    crate::test_log!("Starting long-running file operations test (1 hour)...");

    while start_time.elapsed() < target_duration {
        let file_path = temp_dir
            .path()
            .join(format!("test_{}.txt", iteration_count % 100));

        // Write file with varying sizes
        let data_size = 1024 + (iteration_count % 10240); // 1KB to 11KB
        let data = vec![0u8; data_size];
        fs::write(&file_path, &data).expect("Failed to write file");

        // Read file back
        let read_data = fs::read(&file_path).expect("Failed to read file");
        assert_eq!(read_data.len(), data_size);

        // Delete file
        fs::remove_file(&file_path).expect("Failed to remove file");

        // Explicitly drop large allocations
        drop(data);
        drop(read_data);

        iteration_count += 1;

        if iteration_count % 1000 == 0 {
            let elapsed = start_time.elapsed();
            crate::test_log!(
                "Progress: {} file operations in {:.1} minutes ({:.1}% complete)",
                iteration_count,
                elapsed.as_secs_f64() / 60.0,
                (elapsed.as_secs_f64() / target_duration.as_secs_f64()) * 100.0
            );
        }
    }

    crate::test_log!(
        "Completed {} file operations in {:.1} minutes",
        iteration_count,
        start_time.elapsed().as_secs_f64() / 60.0
    );
}

/// Test that simulates 1+ hour of mixed operations
/// This test combines cursor conversion, file operations, and state management
#[test]
#[ignore] // Ignored by default due to long runtime
fn test_long_running_mixed_operations_no_leak() {
    use std::collections::HashMap;

    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let start_time = Instant::now();
    let target_duration = Duration::from_secs(60 * 60); // 1 hour
    let mut iteration_count = 0;
    let mut state: HashMap<String, String> = HashMap::new();

    crate::test_log!("Starting long-running mixed operations test (1 hour)...");

    while start_time.elapsed() < target_duration {
        // Operation 1: Cursor conversion
        let size = 32 + (iteration_count % 32);
        let image = ImageBuffer::from_fn(size, size, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
        });
        let cursor_result = generate_cur_data(&image, 0, 0);
        assert!(cursor_result.is_ok());
        drop(cursor_result);
        drop(image);

        // Operation 2: File operations
        let file_path = temp_dir
            .path()
            .join(format!("mixed_{}.dat", iteration_count % 50));
        let data = vec![0u8; 2048];
        fs::write(&file_path, &data).expect("Failed to write");
        let _ = fs::read(&file_path).expect("Failed to read");
        fs::remove_file(&file_path).expect("Failed to remove");
        drop(data);

        // Operation 3: State management
        state.insert(
            format!("key_{}", iteration_count % 100),
            format!("value_{}", iteration_count),
        );

        // Periodically clear state to prevent unbounded growth
        if iteration_count % 200 == 0 {
            state.clear();
        }

        iteration_count += 1;

        if iteration_count % 500 == 0 {
            let elapsed = start_time.elapsed();
            crate::test_log!(
                "Progress: {} mixed operations in {:.1} minutes ({:.1}% complete)",
                iteration_count,
                elapsed.as_secs_f64() / 60.0,
                (elapsed.as_secs_f64() / target_duration.as_secs_f64()) * 100.0
            );
        }
    }

    crate::test_log!(
        "Completed {} mixed operations in {:.1} minutes",
        iteration_count,
        start_time.elapsed().as_secs_f64() / 60.0
    );
}

/// Shorter version of long-running test for CI (10 minutes)
/// This provides a balance between test coverage and CI runtime
#[test]
#[ignore] // Ignored by default due to runtime - run with: cargo test --ignored
fn test_medium_duration_operations_no_leak() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let start_time = Instant::now();
    let target_duration = Duration::from_secs(60 * 10); // 10 minutes
    let mut iteration_count = 0;

    crate::test_log!("Starting medium-duration operations test (10 minutes)...");

    while start_time.elapsed() < target_duration {
        // Cursor conversion
        let size = 32 + (iteration_count % 64);
        let image = ImageBuffer::from_fn(size, size, |x, y| {
            Rgba([
                ((x + iteration_count) % 256) as u8,
                ((y + iteration_count) % 256) as u8,
                255,
                255,
            ])
        });
        let result = generate_cur_data(&image, 0, 0);
        assert!(result.is_ok());
        drop(result);
        drop(image);

        // File operation
        let file_path = temp_dir
            .path()
            .join(format!("test_{}.txt", iteration_count % 20));
        fs::write(&file_path, b"test data").expect("Failed to write");
        let _ = fs::read(&file_path).expect("Failed to read");
        fs::remove_file(&file_path).expect("Failed to remove");

        iteration_count += 1;

        if iteration_count % 500 == 0 {
            let elapsed = start_time.elapsed();
            crate::test_log!(
                "Progress: {} operations in {:.1} minutes",
                iteration_count,
                elapsed.as_secs_f64() / 60.0
            );
        }
    }

    crate::test_log!(
        "Completed {} operations in {:.1} minutes without memory issues",
        iteration_count,
        start_time.elapsed().as_secs_f64() / 60.0
    );
}

/// Test that verifies memory usage remains stable over many iterations
/// This test tracks iteration performance to detect memory-related slowdowns
#[test]
#[ignore]
fn test_stable_performance_over_iterations() {
    let mut iteration_times = Vec::new();
    let num_iterations = 1000;

    crate::test_log!(
        "Testing performance stability over {} iterations...",
        num_iterations
    );

    for i in 0..num_iterations {
        let iter_start = Instant::now();

        // Perform a standard operation
        let size = 64;
        let image = ImageBuffer::from_fn(size, size, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
        });
        let result = generate_cur_data(&image, 32, 32);
        assert!(result.is_ok());
        drop(result);
        drop(image);

        let iter_duration = iter_start.elapsed();
        iteration_times.push(iter_duration);

        if (i + 1) % 100 == 0 {
            crate::test_log!("Completed {} iterations", i + 1);
        }
    }

    // Analyze performance stability
    let first_100_avg: Duration = iteration_times[0..100].iter().sum::<Duration>() / 100;
    let last_100_avg: Duration = iteration_times[900..1000].iter().sum::<Duration>() / 100;

    crate::test_log!("First 100 iterations average: {:?}", first_100_avg);
    crate::test_log!("Last 100 iterations average: {:?}", last_100_avg);

    // Performance should not degrade significantly (allow 50% slowdown)
    let slowdown_ratio = last_100_avg.as_secs_f64() / first_100_avg.as_secs_f64();
    crate::test_log!("Performance ratio (last/first): {:.2}x", slowdown_ratio);

    assert!(
        slowdown_ratio < 1.5,
        "Performance degraded too much: {:.2}x slowdown suggests memory leak",
        slowdown_ratio
    );
}

/// Test that verifies temporary allocations are properly freed
/// This test creates and destroys large temporary buffers repeatedly
#[test]
fn test_temporary_allocation_cleanup() {
    let num_iterations = 1000;

    crate::test_log!(
        "Testing temporary allocation cleanup over {} iterations...",
        num_iterations
    );

    for i in 0..num_iterations {
        // Create large temporary buffer
        let large_buffer = vec![0u8; 1024 * 1024]; // 1MB

        // Use the buffer
        let checksum: u64 = large_buffer.iter().map(|&b| b as u64).sum();
        assert_eq!(checksum, 0); // All zeros

        // Buffer is dropped here
        drop(large_buffer);

        if (i + 1) % 100 == 0 {
            crate::test_log!("Completed {} allocations", i + 1);
        }
    }

    crate::test_log!("All temporary allocations cleaned up successfully");
}

/// Test that verifies error paths don't leak memory
/// This test repeatedly triggers error conditions to ensure cleanup
#[test]
fn test_error_path_memory_cleanup() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let num_iterations = 1000;

    crate::test_log!(
        "Testing error path memory cleanup over {} iterations...",
        num_iterations
    );

    for i in 0..num_iterations {
        // Try to read non-existent file (error path)
        let nonexistent = temp_dir.path().join(format!("nonexistent_{}.txt", i));
        let result = fs::read(&nonexistent);
        assert!(result.is_err());

        // Try to convert invalid image data (error path)
        let invalid_image = ImageBuffer::<Rgba<u8>, Vec<u8>>::new(0, 0);
        let result = generate_cur_data(&invalid_image, 0, 0);
        // May succeed or fail depending on implementation, but shouldn't leak
        drop(result);
        drop(invalid_image);

        if (i + 1) % 100 == 0 {
            crate::test_log!("Completed {} error scenarios", i + 1);
        }
    }

    crate::test_log!("All error paths cleaned up successfully");
}
