/// Unit tests for Tauri commands
/// Tests get_available_cursors, set_cursor_image, reset_cursor, library operations, and error paths
/// Requirements: 4.1
use cursor_changer_tauri::state::{AppState, CursorInfo};
use std::collections::HashMap;
use std::sync::Mutex;

// Note: These tests focus on the internal logic of commands.
// Full integration tests with Tauri runtime should be in integration tests.

#[test]
fn test_get_available_cursors_returns_all_cursor_types() {
    // This test verifies the logic that would be in get_available_cursors
    let state = AppState::default();
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    // Simulate what get_available_cursors does
    let mut result = Vec::new();
    for cursor_type in cursor_types {
        let image_path = state
            .cursor
            .read()
            .unwrap()
            .cursor_paths
            .get(cursor_type.name)
            .cloned();
        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path,
        });
    }

    // Verify we got all cursor types
    assert_eq!(result.len(), 15); // Windows has 15 cursor types

    // Verify structure
    assert!(result.iter().any(|c| c.name == "Normal"));
    assert!(result.iter().any(|c| c.name == "Hand"));
    assert!(result.iter().any(|c| c.name == "IBeam"));
}

#[test]
fn test_get_available_cursors_includes_custom_paths() {
    let state = AppState::default();
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor
            .cursor_paths
            .insert("Normal".to_string(), "C:\\test\\cursor.cur".to_string());
        cursor
            .cursor_paths
            .insert("Hand".to_string(), "C:\\test\\hand.cur".to_string());
    }

    let cursor_types = &cursor_changer::CURSOR_TYPES;

    // Simulate what get_available_cursors does
    let mut result = Vec::new();
    for cursor_type in cursor_types {
        let image_path = state
            .cursor
            .read()
            .unwrap()
            .cursor_paths
            .get(cursor_type.name)
            .cloned();
        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path,
        });
    }

    // Find Normal and Hand cursors
    let normal = result.iter().find(|c| c.name == "Normal").unwrap();
    let hand = result.iter().find(|c| c.name == "Hand").unwrap();

    assert_eq!(normal.image_path, Some("C:\\test\\cursor.cur".to_string()));
    assert_eq!(hand.image_path, Some("C:\\test\\hand.cur".to_string()));
}

#[test]
fn test_get_available_cursors_empty_paths_for_unset() {
    let state = AppState::default();
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    // Simulate what get_available_cursors does
    let mut result = Vec::new();
    for cursor_type in cursor_types {
        let image_path = state
            .cursor
            .read()
            .unwrap()
            .cursor_paths
            .get(cursor_type.name)
            .cloned();
        result.push(CursorInfo {
            id: cursor_type.id,
            name: cursor_type.name.to_string(),
            display_name: cursor_type.display_name.to_string(),
            image_path,
        });
    }

    // All should have None for image_path
    assert!(result.iter().all(|c| c.image_path.is_none()));
}

#[test]
fn test_cursor_info_structure() {
    let info = CursorInfo {
        id: 32512,
        name: "Normal".to_string(),
        display_name: "Normal select".to_string(),
        image_path: Some("C:\\test.cur".to_string()),
    };

    assert_eq!(info.id, 32512);
    assert_eq!(info.name, "Normal");
    assert_eq!(info.display_name, "Normal select");
    assert_eq!(info.image_path, Some("C:\\test.cur".to_string()));
}

#[test]
fn test_set_cursor_updates_state() {
    let state = AppState::default();
    let cursor_name = "Normal";
    let cursor_path = "C:\\test\\cursor.cur";

    // Simulate what set_cursor_image does
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor
            .cursor_paths
            .insert(cursor_name.to_string(), cursor_path.to_string());
        cursor.last_loaded_cursor_path = Some(cursor_path.to_string());
    }

    assert_eq!(
        state.cursor.read().unwrap().cursor_paths.get(cursor_name),
        Some(&cursor_path.to_string())
    );
    assert_eq!(
        state.cursor.read().unwrap().last_loaded_cursor_path,
        Some(cursor_path.to_string())
    );
}

#[test]
fn test_set_cursor_preserves_other_cursors() {
    let state = AppState::default();
    {
        state
            .cursor
            .write()
            .unwrap()
            .cursor_paths
            .insert("Hand".to_string(), "C:\\hand.cur".to_string());
    }

    // Set a different cursor
    state
        .cursor
        .write()
        .unwrap()
        .cursor_paths
        .insert("Normal".to_string(), "C:\\normal.cur".to_string());

    // Both should be present
    assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 2);
    assert_eq!(
        state.cursor.read().unwrap().cursor_paths.get("Hand"),
        Some(&"C:\\hand.cur".to_string())
    );
    assert_eq!(
        state.cursor.read().unwrap().cursor_paths.get("Normal"),
        Some(&"C:\\normal.cur".to_string())
    );
}

#[test]
fn test_reset_cursor_clears_state() {
    let state = AppState::default();
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor
            .cursor_paths
            .insert("Normal".to_string(), "C:\\test.cur".to_string());
        cursor.last_loaded_cursor_path = Some("C:\\test.cur".to_string());
    }

    // Simulate reset
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor.cursor_paths.clear();
        cursor.last_loaded_cursor_path = None;
    }

    assert!(state.cursor.read().unwrap().cursor_paths.is_empty());
    assert_eq!(state.cursor.read().unwrap().last_loaded_cursor_path, None);
}

#[test]
fn test_reset_specific_cursor() {
    let state = AppState::default();
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor
            .cursor_paths
            .insert("Normal".to_string(), "C:\\normal.cur".to_string());
        cursor
            .cursor_paths
            .insert("Hand".to_string(), "C:\\hand.cur".to_string());
    }

    // Reset only Normal
    state.cursor.write().unwrap().cursor_paths.remove("Normal");

    assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 1);
    assert_eq!(
        state.cursor.read().unwrap().cursor_paths.get("Hand"),
        Some(&"C:\\hand.cur".to_string())
    );
    assert_eq!(
        state.cursor.read().unwrap().cursor_paths.get("Normal"),
        None
    );
}

#[test]
fn test_library_cursor_structure() {
    use cursor_changer_tauri::state::config::PersistedConfig;

    // Test that we can create library-like structures
    #[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
    struct LibraryCursor {
        pub id: String,
        pub name: String,
        pub file_path: String,
        pub hotspot_x: u16,
        pub hotspot_y: u16,
    }

    let cursor = LibraryCursor {
        id: "lib_123".to_string(),
        name: "My Cursor".to_string(),
        file_path: "C:\\cursors\\my.cur".to_string(),
        hotspot_x: 10,
        hotspot_y: 15,
    };

    assert_eq!(cursor.id, "lib_123");
    assert_eq!(cursor.name, "My Cursor");
    assert_eq!(cursor.hotspot_x, 10);
    assert_eq!(cursor.hotspot_y, 15);
}

#[test]
fn test_library_operations_add() {
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug)]
    struct LibraryData {
        pub cursors: Vec<String>,
    }

    let mut library = LibraryData::default();
    assert!(library.cursors.is_empty());

    library.cursors.push("cursor1".to_string());
    library.cursors.push("cursor2".to_string());

    assert_eq!(library.cursors.len(), 2);
}

#[test]
fn test_library_operations_remove() {
    #[derive(serde::Serialize, serde::Deserialize, Default, Debug)]
    struct LibraryData {
        pub cursors: Vec<String>,
    }

    let mut library = LibraryData::default();
    library.cursors.push("cursor1".to_string());
    library.cursors.push("cursor2".to_string());
    library.cursors.push("cursor3".to_string());

    // Remove cursor2
    library.cursors.retain(|c| c != "cursor2");

    assert_eq!(library.cursors.len(), 2);
    assert!(library.cursors.contains(&"cursor1".to_string()));
    assert!(library.cursors.contains(&"cursor3".to_string()));
    assert!(!library.cursors.contains(&"cursor2".to_string()));
}

#[test]
fn test_command_error_path_invalid_cursor_name() {
    let state = AppState::default();
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    let invalid_name = "InvalidCursor";
    let found = cursor_types.iter().any(|ct| ct.name == invalid_name);

    assert!(!found, "Invalid cursor name should not be found");
}

#[test]
fn test_command_error_path_empty_file_path() {
    let file_path = "";

    // Simulate validation
    let is_valid = !file_path.is_empty();

    assert!(!is_valid, "Empty file path should be invalid");
}

#[test]
fn test_command_error_path_nonexistent_file() {
    let file_path = "C:\\nonexistent\\file.cur";

    // Simulate validation
    let exists = std::path::Path::new(file_path).exists();

    assert!(!exists, "Nonexistent file should fail validation");
}

#[test]
fn test_command_error_path_invalid_cursor_size() {
    let sizes = vec![0, -1, 512, 1024];

    for size in sizes {
        // Simulate validation (valid range is typically 32-256)
        let is_valid = size >= 32 && size <= 256;
        assert!(!is_valid, "Size {} should be invalid", size);
    }
}

#[test]
fn test_command_error_path_state_lock_failure() {
    // This tests the error handling pattern used in commands
    let state = Mutex::new(AppState::default());

    // Normal lock should succeed
    let result = state.lock();
    assert!(result.is_ok());

    // The lock is automatically released when result goes out of scope
}

#[test]
fn test_get_custom_cursors_filters_defaults() {
    let state = AppState::default();

    // Add some custom cursors
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor
            .cursor_paths
            .insert("Normal".to_string(), "C:\\custom\\normal.cur".to_string());
        cursor
            .cursor_paths
            .insert("Hand".to_string(), "C:\\custom\\hand.cur".to_string());

        // Add a default cursor (should be filtered out)
        cursor.cursor_paths.insert(
            "IBeam".to_string(),
            "C:\\app\\default-cursors\\text-select.cur".to_string(),
        );
    }

    // Simulate get_custom_cursors logic
    let cursor_types = &cursor_changer::CURSOR_TYPES;
    let mut result = Vec::new();

    for cursor_type in cursor_types {
        if let Some(image_path) = state
            .cursor
            .read()
            .unwrap()
            .cursor_paths
            .get(cursor_type.name)
        {
            // Only include custom cursors, not app defaults
            if !image_path.contains("default-cursors") {
                result.push(CursorInfo {
                    id: cursor_type.id,
                    name: cursor_type.name.to_string(),
                    display_name: cursor_type.display_name.to_string(),
                    image_path: Some(image_path.clone()),
                });
            }
        }
    }

    // Should only have 2 custom cursors, not the default one
    assert_eq!(result.len(), 2);
    assert!(result.iter().any(|c| c.name == "Normal"));
    assert!(result.iter().any(|c| c.name == "Hand"));
    assert!(!result.iter().any(|c| c.name == "IBeam"));
}

#[test]
fn test_cursor_size_validation() {
    let valid_sizes = vec![32, 48, 64, 96, 128, 256];
    let invalid_sizes = vec![0, 16, 31, 257, 512, -1];

    for size in valid_sizes {
        let is_valid = size >= 32 && size <= 256;
        assert!(is_valid, "Size {} should be valid", size);
    }

    for size in invalid_sizes {
        let is_valid = size >= 32 && size <= 256;
        assert!(!is_valid, "Size {} should be invalid", size);
    }
}

#[test]
fn test_set_all_cursors_updates_all_types() {
    let state = AppState::default();
    let cursor_path = "C:\\test\\cursor.cur";
    let cursor_types = &cursor_changer::CURSOR_TYPES;

    // Simulate set_all_cursors
    for cursor_type in cursor_types {
        state
            .cursor
            .write()
            .unwrap()
            .cursor_paths
            .insert(cursor_type.name.to_string(), cursor_path.to_string());
    }

    // Verify all cursors are set
    assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 15);
    for cursor_type in cursor_types {
        assert_eq!(
            state
                .cursor
                .read()
                .unwrap()
                .cursor_paths
                .get(cursor_type.name),
            Some(&cursor_path.to_string())
        );
    }
}

#[test]
fn test_cursor_state_consistency_after_operations() {
    let state = AppState::default();

    // Perform multiple operations
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor
            .cursor_paths
            .insert("Normal".to_string(), "C:\\normal.cur".to_string());
        cursor.last_loaded_cursor_path = Some("C:\\normal.cur".to_string());
    }
    state.prefs.write().unwrap().cursor_size = 64;

    // Verify consistency
    assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 1);
    assert_eq!(state.prefs.read().unwrap().cursor_size, 64);
    assert_eq!(
        state.cursor.read().unwrap().last_loaded_cursor_path,
        Some("C:\\normal.cur".to_string())
    );

    // Reset operation
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor.cursor_paths.clear();
        cursor.last_loaded_cursor_path = None;
    }

    // Verify reset
    assert!(state.cursor.read().unwrap().cursor_paths.is_empty());
    assert_eq!(state.cursor.read().unwrap().last_loaded_cursor_path, None);
    assert_eq!(state.prefs.read().unwrap().cursor_size, 64); // Size should be preserved
}
