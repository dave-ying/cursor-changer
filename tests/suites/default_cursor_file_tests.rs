use cursor_changer::{
    find_cursor_file_in_dir, find_default_cursor_in_dir, get_default_cursor_base_name,
    get_default_cursor_file, CURSOR_EXTENSIONS, DEFAULT_CURSOR_BASE_NAMES, DEFAULT_CURSOR_FILES,
};

#[test]
fn test_get_default_cursor_file_normal() {
    assert_eq!(get_default_cursor_file("Normal"), Some("normal-select.cur"));
}

#[test]
fn test_get_default_cursor_file_ibeam() {
    assert_eq!(get_default_cursor_file("IBeam"), Some("text-select.cur"));
}

#[test]
fn test_get_default_cursor_file_hand() {
    assert_eq!(get_default_cursor_file("Hand"), Some("link-select.cur"));
}

#[test]
fn test_get_default_cursor_file_wait() {
    assert_eq!(get_default_cursor_file("Wait"), Some("busy.cur"));
}

#[test]
fn test_get_default_cursor_file_all_15_types() {
    for name in crate::common::ALL_CURSOR_NAMES {
        let file = get_default_cursor_file(name);
        assert!(file.is_some(), "Missing file for cursor: {name}");
        assert!(std::path::Path::new(file.unwrap())
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("cur")));
    }
}

#[test]
fn test_get_default_cursor_file_nonexistent() {
    assert_eq!(get_default_cursor_file("NonExistent"), None);
}

#[test]
fn test_get_default_cursor_file_case_sensitive() {
    // Should be case-sensitive
    assert_eq!(get_default_cursor_file("normal"), None);
    assert_eq!(get_default_cursor_file("NORMAL"), None);
}

#[test]
fn test_default_cursor_files_count() {
    assert_eq!(DEFAULT_CURSOR_FILES.len(), 15);
}

#[test]
fn test_default_cursor_files_all_unique() {
    let mut files = std::collections::HashSet::new();
    for (_, file) in &DEFAULT_CURSOR_FILES {
        assert!(files.insert(file), "Duplicate file: {file}");
    }
}

// Tests for new name-based cursor lookup functions
#[test]
fn test_default_cursor_base_names_count() {
    assert_eq!(DEFAULT_CURSOR_BASE_NAMES.len(), 15);
}

#[test]
fn test_default_cursor_base_names_all_unique() {
    let mut names = std::collections::HashSet::new();
    for (_, base_name) in &DEFAULT_CURSOR_BASE_NAMES {
        assert!(names.insert(base_name), "Duplicate base name: {base_name}");
    }
}

#[test]
fn test_get_default_cursor_base_name_normal() {
    assert_eq!(
        get_default_cursor_base_name("Normal"),
        Some("normal-select")
    );
}

#[test]
fn test_get_default_cursor_base_name_wait() {
    assert_eq!(get_default_cursor_base_name("Wait"), Some("busy"));
}

#[test]
fn test_get_default_cursor_base_name_nonexistent() {
    assert_eq!(get_default_cursor_base_name("NonExistent"), None);
}

#[test]
fn test_get_default_cursor_base_name_all_15_types() {
    for name in crate::common::ALL_CURSOR_NAMES {
        let base_name = get_default_cursor_base_name(name);
        assert!(base_name.is_some(), "Missing base name for cursor: {name}");
        // Base names should not have extensions
        assert!(
            !base_name.unwrap().contains('.'),
            "Base name should not have extension: {}",
            base_name.unwrap()
        );
    }
}

#[test]
fn test_cursor_extensions_order() {
    // .ani should be checked before .cur (preferred for animated cursors)
    assert_eq!(CURSOR_EXTENSIONS[0], "ani");
    assert_eq!(CURSOR_EXTENSIONS[1], "cur");
}

#[test]
fn test_find_cursor_file_in_dir_with_cur() {
    use std::path::Path;
    // Test with the windows default cursors directory (has .cur files)
    let windows_dir = Path::new("src-tauri/default-cursors/windows");
    if windows_dir.exists() {
        let result = find_cursor_file_in_dir(windows_dir, "normal-select");
        assert!(result.is_some(), "Should find normal-select cursor");
        let path = result.unwrap();
        assert!(path.exists(), "Found path should exist");
        assert!(
            path.to_string_lossy().ends_with(".cur"),
            "Should find .cur file"
        );
    }
}

#[test]
fn test_find_cursor_file_in_dir_with_ani() {
    use std::path::Path;
    // Test with the mac default cursors directory (has busy.ani)
    let mac_dir = Path::new("src-tauri/default-cursors/mac");
    if mac_dir.exists() {
        let result = find_cursor_file_in_dir(mac_dir, "busy");
        assert!(result.is_some(), "Should find busy cursor");
        let path = result.unwrap();
        assert!(path.exists(), "Found path should exist");
        // Mac has busy.ani, so it should prefer .ani over .cur
        assert!(
            path.to_string_lossy().ends_with(".ani"),
            "Should find .ani file for mac busy cursor"
        );
    }
}

#[test]
fn test_find_cursor_file_in_dir_nonexistent() {
    use std::path::Path;
    let windows_dir = Path::new("src-tauri/default-cursors/windows");
    if windows_dir.exists() {
        let result = find_cursor_file_in_dir(windows_dir, "nonexistent-cursor");
        assert!(result.is_none(), "Should not find nonexistent cursor");
    }
}

#[test]
fn test_find_default_cursor_in_dir() {
    use std::path::Path;
    let windows_dir = Path::new("src-tauri/default-cursors/windows");
    if windows_dir.exists() {
        let result = find_default_cursor_in_dir(windows_dir, "Normal");
        assert!(result.is_some(), "Should find Normal cursor");
        let path = result.unwrap();
        assert!(path.exists(), "Found path should exist");
    }
}

#[test]
fn test_find_default_cursor_in_dir_mac_busy() {
    use std::path::Path;
    let mac_dir = Path::new("src-tauri/default-cursors/mac");
    if mac_dir.exists() {
        let result = find_default_cursor_in_dir(mac_dir, "Wait");
        assert!(result.is_some(), "Should find Wait (busy) cursor for mac");
        let path = result.unwrap();
        assert!(path.exists(), "Found path should exist");
        // Mac busy cursor is .ani
        assert!(
            path.to_string_lossy().ends_with(".ani"),
            "Mac Wait cursor should be .ani file"
        );
    }
}
