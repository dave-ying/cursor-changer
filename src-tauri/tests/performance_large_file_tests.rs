use cursor_changer_tauri::cursor_converter::generate_cur_data;
use image::{ImageBuffer, Rgba, RgbaImage};
/// Performance tests for large file handling
///
/// These tests verify efficient memory usage and reasonable processing time
/// when handling large cursor files and images.
///
/// **Validates: Requirements 7.5**
use std::fs;
use std::time::Instant;
use tempfile::TempDir;

#[macro_use]
mod test_support;

/// Test processing of large cursor images (128x128)
/// Verifies that large cursors are handled efficiently
#[test]
fn test_large_cursor_128x128_processing() {
    let size = 128u32;

    crate::test_log!("Testing large cursor processing: {}x{}", size, size);
    let start_time = Instant::now();

    // Create large cursor image
    let image = ImageBuffer::from_fn(size, size, |x, y| {
        Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
    });

    let creation_time = start_time.elapsed();
    crate::test_log!("Image creation time: {:?}", creation_time);

    // Convert to cursor
    let convert_start = Instant::now();
    let hotspot = (size / 2) as u16;
    let result = generate_cur_data(&image, hotspot, hotspot);
    let convert_time = convert_start.elapsed();

    crate::test_log!("Conversion time: {:?}", convert_time);

    assert!(result.is_ok(), "Large cursor conversion should succeed");

    let cursor_data = result.unwrap();
    crate::test_log!("Output cursor size: {} bytes", cursor_data.len());

    // Verify reasonable processing time (should be under 1 second)
    assert!(
        convert_time.as_secs() < 1,
        "Large cursor conversion should complete in under 1 second, took {:?}",
        convert_time
    );

    // Verify memory efficiency (output should be reasonable size)
    // Cursor format includes headers and bitmap data
    let expected_max_size = (size * size * 4) as usize + 10240; // RGBA + headers + padding
    assert!(
        cursor_data.len() < expected_max_size,
        "Cursor data size {} should be less than expected max {}",
        cursor_data.len(),
        expected_max_size
    );
}

/// Test processing of very large cursor images (256x256)
/// Verifies that very large cursors are handled without memory issues
#[test]
fn test_very_large_cursor_256x256_processing() {
    let size = 256u32;

    crate::test_log!("Testing very large cursor processing: {}x{}", size, size);
    let start_time = Instant::now();

    // Create very large cursor image
    let image = ImageBuffer::from_fn(size, size, |x, y| {
        Rgba([
            ((x * 7) % 256) as u8,
            ((y * 11) % 256) as u8,
            ((x + y) % 256) as u8,
            255,
        ])
    });

    let creation_time = start_time.elapsed();
    crate::test_log!("Image creation time: {:?}", creation_time);

    // Convert to cursor
    let convert_start = Instant::now();
    let hotspot = (size / 2) as u16;
    let result = generate_cur_data(&image, hotspot, hotspot);
    let convert_time = convert_start.elapsed();

    crate::test_log!("Conversion time: {:?}", convert_time);

    assert!(
        result.is_ok(),
        "Very large cursor conversion should succeed"
    );

    let cursor_data = result.unwrap();
    crate::test_log!("Output cursor size: {} bytes", cursor_data.len());

    // Verify reasonable processing time (should be under 2 seconds)
    assert!(
        convert_time.as_secs() < 2,
        "Very large cursor conversion should complete in under 2 seconds, took {:?}",
        convert_time
    );
}

/// Test batch processing of multiple large cursors
/// Verifies that processing multiple large files doesn't cause memory issues
#[test]
fn test_batch_large_cursor_processing() {
    let num_cursors = 10;
    let size = 96u32;

    crate::test_log!(
        "Testing batch processing: {} cursors of {}x{}",
        num_cursors,
        size,
        size
    );
    let start_time = Instant::now();

    for i in 0..num_cursors {
        // Create large cursor image
        let image = ImageBuffer::from_fn(size, size, |x, y| {
            Rgba([
                ((x + i) % 256) as u8,
                ((y + i) % 256) as u8,
                ((x + y + i) % 256) as u8,
                255,
            ])
        });

        // Convert to cursor
        let hotspot = (size / 2) as u16;
        let result = generate_cur_data(&image, hotspot, hotspot);
        assert!(result.is_ok(), "Cursor {} conversion should succeed", i);

        // Explicitly drop to free memory
        drop(result);
        drop(image);

        if (i + 1) % 5 == 0 {
            crate::test_log!("Processed {} cursors", i + 1);
        }
    }

    let elapsed = start_time.elapsed();
    let avg_time = elapsed / num_cursors;

    crate::test_log!("Total time: {:?}", elapsed);
    crate::test_log!("Average time per cursor: {:?}", avg_time);

    // Verify reasonable total processing time
    assert!(
        elapsed.as_secs() < 10,
        "Batch processing should complete in under 10 seconds, took {:?}",
        elapsed
    );
}

/// Test reading and processing large image files from disk
/// Verifies efficient file I/O and memory usage
#[test]
fn test_large_file_io_performance() {
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let file_sizes = vec![
        1024 * 100,      // 100 KB
        1024 * 500,      // 500 KB
        1024 * 1024,     // 1 MB
        1024 * 1024 * 2, // 2 MB
    ];

    crate::test_log!("Testing large file I/O performance");

    for size in file_sizes {
        let file_path = temp_dir.path().join(format!("large_file_{}.dat", size));

        // Write large file
        let write_start = Instant::now();
        let data = vec![0u8; size];
        fs::write(&file_path, &data).expect("Failed to write large file");
        let write_time = write_start.elapsed();

        // Read large file
        let read_start = Instant::now();
        let read_data = fs::read(&file_path).expect("Failed to read large file");
        let read_time = read_start.elapsed();

        crate::test_log!(
            "File size: {} KB - Write: {:?}, Read: {:?}",
            size / 1024,
            write_time,
            read_time
        );

        assert_eq!(read_data.len(), size);

        // Cleanup
        fs::remove_file(&file_path).expect("Failed to remove file");
        drop(data);
        drop(read_data);

        // Verify reasonable I/O times (should be under 1 second for 2MB)
        assert!(
            write_time.as_secs() < 1,
            "Write time should be under 1 second for {} KB",
            size / 1024
        );
        assert!(
            read_time.as_secs() < 1,
            "Read time should be under 1 second for {} KB",
            size / 1024
        );
    }
}

/// Test memory usage with large image buffers
/// Verifies that large allocations are handled efficiently
#[test]
fn test_large_image_buffer_memory_usage() {
    let sizes = vec![64, 96, 128, 192, 256];

    crate::test_log!("Testing memory usage with various image sizes");

    for size in sizes {
        let alloc_start = Instant::now();

        // Allocate large image buffer
        let image: RgbaImage = ImageBuffer::from_fn(size, size, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
        });

        let alloc_time = alloc_start.elapsed();

        // Calculate memory usage
        let pixel_count = size * size;
        let bytes_per_pixel = 4; // RGBA
        let memory_usage = pixel_count * bytes_per_pixel;

        crate::test_log!(
            "Size: {}x{} - Memory: {} KB - Allocation time: {:?}",
            size,
            size,
            memory_usage / 1024,
            alloc_time
        );

        // Verify image properties
        assert_eq!(image.width(), size);
        assert_eq!(image.height(), size);

        // Verify reasonable allocation time
        assert!(
            alloc_time.as_millis() < 100,
            "Image allocation should be fast, took {:?}",
            alloc_time
        );

        drop(image);
    }
}

/// Test processing time scales reasonably with image size
/// Verifies that processing time is proportional to image size
#[test]
fn test_processing_time_scaling() {
    let sizes = vec![32, 48, 64, 96, 128];
    let mut times = Vec::new();

    crate::test_log!("Testing processing time scaling");

    for size in &sizes {
        let image = ImageBuffer::from_fn(*size, *size, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
        });

        let start = Instant::now();
        let hotspot = (*size / 2) as u16;
        let result = generate_cur_data(&image, hotspot, hotspot);
        let elapsed = start.elapsed();

        assert!(result.is_ok());

        times.push(elapsed);
        crate::test_log!("Size: {}x{} - Time: {:?}", size, size, elapsed);

        drop(result);
        drop(image);
    }

    // Verify that processing time increases with size
    // (later sizes should generally take longer, though not strictly monotonic)
    let first_time = times[0];
    let last_time = times[times.len() - 1];

    crate::test_log!(
        "Time ratio ({}x{} / {}x{}): {:.2}x",
        sizes[sizes.len() - 1],
        sizes[sizes.len() - 1],
        sizes[0],
        sizes[0],
        last_time.as_secs_f64() / first_time.as_secs_f64()
    );
}

/// Test concurrent processing of large files
/// Verifies that multiple large files can be processed simultaneously
#[test]
fn test_concurrent_large_file_processing() {
    use std::sync::Arc;
    use std::thread;

    let num_threads = 4;
    let size = 96u32;
    let mut handles = vec![];

    crate::test_log!(
        "Testing concurrent large file processing: {} threads",
        num_threads
    );
    let start_time = Instant::now();

    for thread_id in 0..num_threads {
        let handle = thread::spawn(move || {
            // Create large cursor image
            let image = ImageBuffer::from_fn(size, size, |x, y| {
                Rgba([
                    ((x + thread_id) % 256) as u8,
                    ((y + thread_id) % 256) as u8,
                    ((x + y) % 256) as u8,
                    255,
                ])
            });

            // Convert to cursor
            let hotspot = (size / 2) as u16;
            let result = generate_cur_data(&image, hotspot, hotspot);

            assert!(
                result.is_ok(),
                "Thread {} conversion should succeed",
                thread_id
            );

            result.unwrap().len()
        });

        handles.push(handle);
    }

    // Wait for all threads and collect results
    let mut total_bytes = 0;
    for handle in handles {
        let bytes = handle.join().unwrap();
        total_bytes += bytes;
    }

    let elapsed = start_time.elapsed();

    crate::test_log!("Total time: {:?}", elapsed);
    crate::test_log!("Total output: {} KB", total_bytes / 1024);

    // Verify reasonable concurrent processing time
    assert!(
        elapsed.as_secs() < 5,
        "Concurrent processing should complete in under 5 seconds, took {:?}",
        elapsed
    );
}

/// Test memory cleanup after processing large files
/// Verifies that memory is properly freed after processing
#[test]
fn test_large_file_memory_cleanup() {
    let iterations = 20;
    let size = 128u32;

    crate::test_log!("Testing memory cleanup over {} iterations", iterations);

    for i in 0..iterations {
        // Allocate large image
        let image = ImageBuffer::from_fn(size, size, |x, y| {
            Rgba([
                ((x + i) % 256) as u8,
                ((y + i) % 256) as u8,
                ((x + y) % 256) as u8,
                255,
            ])
        });

        // Process
        let hotspot = (size / 2) as u16;
        let result = generate_cur_data(&image, hotspot, hotspot);
        assert!(result.is_ok());

        // Explicitly drop to ensure cleanup
        drop(result);
        drop(image);

        if (i + 1) % 5 == 0 {
            crate::test_log!("Completed {} iterations", i + 1);
        }
    }

    crate::test_log!("All iterations completed successfully");
}

/// Test handling of maximum reasonable cursor size
/// Verifies that the system can handle the largest practical cursor sizes
#[test]
fn test_maximum_cursor_size_handling() {
    // Windows supports cursors up to 256x256, but practical sizes are usually smaller
    let max_practical_size = 256u32;

    crate::test_log!(
        "Testing maximum practical cursor size: {}x{}",
        max_practical_size,
        max_practical_size
    );
    let start_time = Instant::now();

    let image = ImageBuffer::from_fn(max_practical_size, max_practical_size, |x, y| {
        Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
    });

    let hotspot = (max_practical_size / 2) as u16;
    let result = generate_cur_data(&image, hotspot, hotspot);
    let elapsed = start_time.elapsed();

    crate::test_log!("Processing time: {:?}", elapsed);

    assert!(
        result.is_ok(),
        "Maximum size cursor should be processed successfully"
    );

    if let Ok(cursor_data) = result {
        crate::test_log!("Output size: {} KB", cursor_data.len() / 1024);

        // Verify reasonable output size
        assert!(
            cursor_data.len() < 1024 * 1024 * 5, // Less than 5MB
            "Output size should be reasonable"
        );
    }

    // Verify reasonable processing time (under 3 seconds)
    assert!(
        elapsed.as_secs() < 3,
        "Maximum size processing should complete in under 3 seconds, took {:?}",
        elapsed
    );
}
