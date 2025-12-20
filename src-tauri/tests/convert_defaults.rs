//! Test to verify that all 15 default .CUR cursor files exist and are valid
//! Run with: cargo test --test convert_defaults -- --nocapture

#[test]
fn verify_all_default_cursors_exist() {
    use std::fs;
    use std::path::PathBuf;

    // Get the manifest directory (src-tauri) and look for default-cursors there
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_else(|_| ".".to_string());
    let default_cursors_dir = PathBuf::from(&manifest_dir)
        .join("default-cursors")
        .join("windows");

    // All 15 cursor names that should have .CUR files
    let cursor_names = vec![
        "normal-select",         // Top-left (arrow tip)
        "text-select",           // Center of I-beam
        "link-select",           // Hand pointing finger
        "busy",                  // Hourglass/spinner
        "vertical-resize",       // Vertical resize arrow
        "horizontal-resize",     // Horizontal resize arrow
        "diagonal-resize-1",     // Diagonal resize (NE-SW)
        "diagonal-resize-2",     // Diagonal resize (NW-SE)
        "move",                  // Four-way move cursor
        "help-select",           // Question mark
        "unavailable",           // Not allowed/prohibited
        "working-in-background", // Working background indicator
        "alternate-select",      // Alternate select
        "precision-select",      // Crosshair
        "pen",                   // Pen tool
    ];

    println!("\nVerifying 15 pre-built default .CUR cursor files...");
    println!("Looking in: {}\n", default_cursors_dir.display());

    let mut found_count = 0;
    let mut missing_count = 0;

    for name in cursor_names {
        let cur_path = default_cursors_dir.join(format!("{}.cur", name));

        if cur_path.exists() {
            if let Ok(metadata) = fs::metadata(&cur_path) {
                let size = metadata.len();
                println!("✓ {} ({} bytes)", name, size);
                found_count += 1;
            } else {
                println!("✗ {} (cannot read metadata)", name);
                missing_count += 1;
            }
        } else {
            println!("✗ {} (file not found at {})", name, cur_path.display());
            missing_count += 1;
        }
    }

    println!(
        "\n✅ Result: {} found, {} missing\n",
        found_count, missing_count
    );

    if found_count == 15 {
        println!("✓ All 15 pre-built .CUR files are present in default-cursors/");
    }

    assert_eq!(missing_count, 0, "Some .CUR files are missing!");
    assert_eq!(found_count, 15, "Expected all 15 .CUR files to be present!");
}
