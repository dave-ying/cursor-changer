//! Test program to convert SVG cursors to .CUR format
//! Run with: cargo test --package cursor_changer_tauri --test convert_svg_cursors -- --nocapture

use cursor_changer_tauri::cursor_converter;

#[test]
#[ignore = "SVG source files not in repository - CUR files already exist"]
fn convert_all_default_cursors() {
    use std::path::PathBuf;

    // Get the package root directory
    let manifest_dir =
        std::env::var("CARGO_MANIFEST_DIR").expect("Failed to get CARGO_MANIFEST_DIR");
    let root_dir = PathBuf::from(manifest_dir);
    let cur_dir = root_dir.join("default-cursors").join("windows");

    // Create output directory
    std::fs::create_dir_all(&cur_dir).expect("Failed to create output directory");

    // Define cursor mappings with appropriate hotspots (x, y)
    let cursors = vec![
        ("normal-select", 0, 0),         // Top-left (arrow tip)
        ("text-select", 8, 12),          // Center of I-beam
        ("link-select", 8, 4),           // Hand pointing finger
        ("busy", 16, 16),                // Center
        ("vertical-resize", 16, 16),     // Center
        ("horizontal-resize", 16, 16),   // Center
        ("diagonal-resize-1", 16, 16),   // Center
        ("diagonal-resize-2", 16, 16),   // Center
        ("move", 16, 16),                // Center
        ("help-select", 0, 0),           // Arrow tip
        ("unavailable", 16, 16),         // Center
        ("working-in-background", 0, 0), // Arrow tip
        ("alternate-select", 8, 0),      // Top center
        ("precision-select", 16, 16),    // Center of crosshair
        ("pen", 2, 2),                   // Pen tip
    ];

    println!("\nConverting default SVG cursors to .CUR format (256x256)...\n");

    let mut success_count = 0;
    let mut fail_count = 0;

    for (name, hotspot_x, hotspot_y) in cursors {
        let svg_path = cur_dir.join(format!("{}.svg", name));
        let cur_path = cur_dir.join(format!("{}.cur", name));

        if !svg_path.exists() {
            println!("✗ SVG not found: {:?}", svg_path);
            fail_count += 1;
            continue;
        }

        match cursor_converter::convert_to_cur(
            svg_path.to_str().unwrap(),
            cur_path.to_str().unwrap(),
            256,
            hotspot_x,
            hotspot_y,
            1.0,
            0,
            0,
        ) {
            Ok(_) => {
                println!(
                    "✓ Converted: {} (hotspot: {},{}) -> {:?}",
                    name, hotspot_x, hotspot_y, cur_path
                );
                success_count += 1;
            }
            Err(e) => {
                println!("✗ Failed to convert {:?}: {}", svg_path, e);
                fail_count += 1;
            }
        }
    }

    println!("\n✅ {} successful, {} failed", success_count, fail_count);

    assert_eq!(fail_count, 0, "Some conversions failed!");
    assert_eq!(success_count, 15, "Expected 15 successful conversions!");

    println!("\n✓ All .CUR files created in: {:?}", cur_dir);
    println!("These files will be bundled with the app and loaded as defaults.");
}
