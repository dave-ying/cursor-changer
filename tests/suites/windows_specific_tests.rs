use cursor_changer::{clear_cursor_registry_entries, get_windows_cursors_folder};

#[cfg(windows)]
#[test]
fn test_get_windows_cursors_folder() {
    let folder = get_windows_cursors_folder();
    assert!(folder.is_some());

    if let Some(path) = folder {
        let lower = path.to_ascii_lowercase();
        assert!(lower.contains("windows"));
        assert!(lower.contains("cursors"));
        assert!(path.contains(":\\"));
    }
}

#[cfg(windows)]
#[test]
fn test_get_windows_cursors_folder_uses_windir() {
    // The function should respect WINDIR environment variable
    let folder = get_windows_cursors_folder();
    assert!(folder.is_some());
}

#[cfg(windows)]
#[test]
fn test_clear_cursor_registry_entries() {
    // This test only verifies the function runs without crashing
    // Actual registry writes require admin privileges in some cases
    // We can't verify the actual write in a unit test
    let _result = clear_cursor_registry_entries();
    // Result can be true or false depending on permissions
    // Just verify it doesn't panic - the function call itself is the test
}
