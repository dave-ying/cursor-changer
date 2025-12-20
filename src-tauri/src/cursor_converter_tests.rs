// Quick test to verify cursor conversion functionality
// Run with: cargo test --package cursor_changer_tauri --bin cursor_changer_tauri test_conversion -- --nocapture

#[cfg(test)]
mod conversion_tests {
    use super::super::cursor_converter;
    
    #[test]
    #[ignore] // Run manually with: cargo test test_conversion -- --ignored --nocapture
    fn test_conversion_creates_cur_file() {
        // This test requires the test-cursor.svg file to exist
        let input_path = "..\\test-cursor.svg";
        let output_path = "test-output.cur";
        
        if !std::path::Path::new(input_path).exists() {
            println!("⚠️  Test skipped: {} not found", input_path);
            return;
        }
        
        let result = cursor_converter::convert_to_cur(
            input_path,
            output_path,
            256,  // Size
            0,    // Hotspot X
            0,    // Hotspot Y
        );
        
        match result {
            Ok(_) => {
                println!("✅ Conversion successful!");
                assert!(std::path::Path::new(output_path).exists(), "Output file should exist");
                
                // Check file size (should be reasonable for a 256x256 cursor)
                let metadata = std::fs::metadata(output_path).expect("Should read metadata");
                let size = metadata.len();
                println!("   Output file size: {} bytes", size);
                assert!(size > 1000, "File should be larger than 1KB");
                assert!(size < 500_000, "File should be smaller than 500KB");
                
                // Clean up
                let _ = std::fs::remove_file(output_path);
                println!("   Cleaned up test file");
            }
            Err(e) => {
                panic!("❌ Conversion failed: {}", e);
            }
        }
    }
    
    #[test]
    fn test_helper_functions() {
        use cursor_converter::{write_u16, write_u32};
        
        // Test write_u16
        let mut data = Vec::new();
        write_u16(&mut data, 0x1234).unwrap();
        assert_eq!(data, vec![0x34, 0x12], "Should write little-endian u16");
        
        // Test write_u32
        let mut data = Vec::new();
        write_u32(&mut data, 0x12345678).unwrap();
        assert_eq!(data, vec![0x78, 0x56, 0x34, 0x12], "Should write little-endian u32");
        
        println!("✅ Helper functions work correctly");
    }
}
