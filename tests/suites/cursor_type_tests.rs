use cursor_changer::CURSOR_TYPES;

#[test]
fn test_all_cursor_types_have_unique_ids() {
    let mut ids = std::collections::HashSet::new();
    for cursor_type in &CURSOR_TYPES {
        assert!(
            ids.insert(cursor_type.id),
            "Duplicate ID: {}",
            cursor_type.id
        );
    }
}

#[test]
fn test_all_cursor_types_have_unique_names() {
    let mut names = std::collections::HashSet::new();
    for cursor_type in &CURSOR_TYPES {
        assert!(
            names.insert(cursor_type.name),
            "Duplicate name: {}",
            cursor_type.name
        );
    }
}

#[test]
fn test_all_cursor_types_have_unique_registry_keys() {
    let mut keys = std::collections::HashSet::new();
    for cursor_type in &CURSOR_TYPES {
        assert!(
            keys.insert(cursor_type.registry_key),
            "Duplicate registry key: {}",
            cursor_type.registry_key
        );
    }
}

#[test]
fn test_cursor_types_have_standard_windows_ids() {
    // Standard Windows cursor IDs start at 32512
    for cursor_type in &CURSOR_TYPES {
        assert!(cursor_type.id >= 32512 && cursor_type.id <= 32700);
    }
}

#[test]
fn test_all_cursor_types_have_non_empty_display_names() {
    for cursor_type in &CURSOR_TYPES {
        assert!(!cursor_type.display_name.is_empty());
        assert!(cursor_type.display_name.len() > 2); // At least 3 chars
    }
}

#[test]
fn test_cursor_types_array_length() {
    assert_eq!(CURSOR_TYPES.len(), 15);
}

#[test]
fn test_cursor_types_all_have_valid_ids() {
    for cursor_type in &CURSOR_TYPES {
        assert!(cursor_type.id > 0);
        assert!(cursor_type.id >= 32512 && cursor_type.id <= 32700);
    }
}

#[test]
fn test_cursor_types_contains_standard_ids() {
    // Verify standard Windows cursor IDs are present in CURSOR_TYPES
    let ids: Vec<u32> = CURSOR_TYPES.iter().map(|ct| ct.id).collect();
    assert!(ids.contains(&32512)); // OCR_NORMAL
    assert!(ids.contains(&32513)); // OCR_IBEAM
    assert!(ids.contains(&32649)); // OCR_HAND
}

#[test]
fn test_cursor_types_no_duplicate_ids() {
    let mut unique = std::collections::HashSet::new();
    for cursor_type in &CURSOR_TYPES {
        assert!(
            unique.insert(cursor_type.id),
            "Duplicate ID: {}",
            cursor_type.id
        );
    }
}

#[test]
fn test_cursor_types_count() {
    assert_eq!(CURSOR_TYPES.len(), 15);
}
