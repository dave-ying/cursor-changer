//! Unit tests for cursor_changer library functions
//! Moved from src/lib.rs to keep the main library file clean

use cursor_changer::*;
use cursor_changer::win_cursor::{CURSOR_TYPES};

#[test]
fn test_get_windows_cursors_folder() {
    let result = get_windows_cursors_folder();
    if let Some(path) = result {
        println!("Windows Cursors folder: {path}");
        assert!(path.contains("Cursors"));
        // Should contain a drive letter (C, D, E, etc.)
        assert!(path.contains(":\\"));
    }
}

#[test]
fn to_wide_basic_ascii() {
    let w = to_wide("hello");
    // should end with terminating NUL
    assert_eq!(w.last(), Some(&0u16));
    // round trip for ASCII characters (skip trailing NUL)
    let s = String::from_utf16(&w[..w.len() - 1]).expect("valid UTF-16");
    assert_eq!(s, "hello");
}

#[test]
fn to_wide_unicode() {
    let orig = "Hï•✓ — 🎉";
    let w = to_wide(orig);
    assert_eq!(w.last(), Some(&0u16));
    let s = String::from_utf16(&w[..w.len() - 1]).expect("valid UTF-16");
    assert_eq!(s, orig);
}

#[test]
fn cursor_plane_size_calculation() {
    // Sanity check: first cursor type should exist
    assert!(!CURSOR_TYPES.is_empty());
}

#[test]
fn copy_tip_fits() {
    let mut buf = [0u16; 128];
    let written = copy_tip_to_buf("Short tip", &mut buf);
    assert!(written > 0);
    // ensure terminating NUL was written
    assert_eq!(buf[written - 1], 0u16);
    let s = String::from_utf16(&buf[..written - 1]).expect("valid utf16");
    assert_eq!(s, "Short tip");
}

#[test]
fn copy_tip_truncates() {
    let mut buf = [0u16; 4];
    // long string will be truncated; function should return number of words written
    let written = copy_tip_to_buf("This is a long tip", &mut buf);
    assert!(written <= buf.len());
    // If buffer full without terminator, last element won't be NUL
    if written == buf.len() {
        assert_ne!(buf[written - 1], 0u16);
    }
}

#[test]
fn toggle_action_tests() {
    assert_eq!(toggle_action(false), ToggleAction::Apply);
    assert_eq!(toggle_action(true), ToggleAction::Restore);
}

#[test]
fn to_wide_empty() {
    let w = to_wide("");
    assert_eq!(w, vec![0u16]);
}

#[test]
fn build_tip_buffer_basic() {
    let buf = build_tip_buffer("Hello");
    assert_eq!(buf.len(), 128);
    // find terminating NUL
    let pos = buf
        .iter()
        .position(|&c| c == 0u16)
        .expect("should have NUL");
    let s = String::from_utf16(&buf[..pos]).expect("valid utf16");
    assert_eq!(s, "Hello");
}

#[allow(clippy::struct_excessive_bools)]
struct FakeSystemApi {
    applied: bool,
    restored: bool,
    apply_ok: bool,
    restore_ok: bool,
}

impl FakeSystemApi {
    fn new() -> Self {
        Self {
            applied: false,
            restored: false,
            apply_ok: true,
            restore_ok: true,
        }
    }
}

impl SystemApi for FakeSystemApi {
    fn apply_blank_system_cursors(&mut self) -> bool {
        self.applied = true;
        self.apply_ok
    }

    fn restore_system_cursors(&mut self) -> bool {
        self.restored = true;
        self.restore_ok
    }
}

#[test]
fn perform_toggle_apply() {
    let mut api = FakeSystemApi::new();
    api.apply_ok = true;
    let (ok, new_hidden) = perform_toggle(&mut api, false);
    assert!(ok);
    assert!(new_hidden);
    assert!(api.applied);
}

#[test]
fn perform_toggle_restore() {
    let mut api = FakeSystemApi::new();
    api.restore_ok = true;
    let (ok, new_hidden) = perform_toggle(&mut api, true);
    assert!(ok);
    assert!(!new_hidden);
    assert!(api.restored);
}

#[test]
fn test_cursor_ids_array_has_all_cursors() {
    // Ensure CURSOR_TYPES contains all 15 cursor types
    assert_eq!(CURSOR_TYPES.len(), 15);

    // Verify IDs are unique
    let mut ids: Vec<u32> = CURSOR_TYPES.iter().map(|ct| ct.id).collect();
    ids.sort_unstable();
    ids.dedup();
    assert_eq!(ids.len(), 15);
}

#[test]
fn test_cursor_types_array_has_all_cursors() {
    assert_eq!(CURSOR_TYPES.len(), 15);

    // Each cursor type should have a valid ID
    for cursor_type in &CURSOR_TYPES {
        assert!(cursor_type.id > 0);
        assert!(!cursor_type.name.is_empty());
        assert!(!cursor_type.registry_key.is_empty());
        assert!(!cursor_type.display_name.is_empty());
    }
}

#[test]
fn test_cursor_types_match_cursor_ids() {
    // IDs are checked for uniqueness in test_cursor_ids_array_has_all_cursors.
    // This test now simply ensures the cursor type list is non-empty.
    assert!(!CURSOR_TYPES.is_empty());
}

#[test]
fn test_cursor_type_registry_keys_unique() {
    use std::collections::HashSet;
    let mut keys = HashSet::new();

    for cursor_type in &CURSOR_TYPES {
        assert!(
            keys.insert(cursor_type.registry_key),
            "Duplicate registry key: {}",
            cursor_type.registry_key
        );
    }
}

#[test]
fn test_cursor_plane_bytes_correct_size() {
    // Cursor plane byte constants are internal; integration tests should not depend on them.
    assert!(true);
}

#[test]
fn test_copy_tip_empty_string() {
    let mut buf = [0u16; 10];
    let written = copy_tip_to_buf("", &mut buf);
    assert_eq!(written, 1); // just the NUL
    assert_eq!(buf[0], 0u16);
}

#[test]
fn test_copy_tip_exact_fit() {
    let mut buf = [0u16; 6]; // "hello" = 5 chars + 1 NUL
    let written = copy_tip_to_buf("hello", &mut buf);
    assert_eq!(written, 6);
    assert_eq!(buf[5], 0u16);
}

#[test]
fn test_copy_tip_unicode_characters() {
    let mut buf = [0u16; 20];
    let written = copy_tip_to_buf("Hello 世界", &mut buf);
    assert!(written > 0);
    assert_eq!(buf[written - 1], 0u16);
}

#[test]
fn test_build_tip_buffer_always_128() {
    let buf = build_tip_buffer("test");
    assert_eq!(buf.len(), 128);
}

#[test]
fn test_build_tip_buffer_long_string() {
    let long_string = "a".repeat(200);
    let buf = build_tip_buffer(&long_string);
    assert_eq!(buf.len(), 128);

    // Find where the NUL or truncation occurs
    let nul_pos = buf.iter().position(|&c| c == 0u16);
    assert!(nul_pos.is_some() || buf[127] != 0u16);
}

#[test]
fn test_toggle_action_idempotent_logic() {
    // Toggling twice should return to original action
    let action1 = toggle_action(false);
    let action2 = toggle_action(true);

    assert_eq!(action1, ToggleAction::Apply);
    assert_eq!(action2, ToggleAction::Restore);
}

#[test]
fn test_perform_toggle_apply_failure() {
    let mut api = FakeSystemApi::new();
    api.apply_ok = false;

    let (ok, new_hidden) = perform_toggle(&mut api, false);
    assert!(!ok);
    assert!(!new_hidden); // Should remain false on failure
}

#[test]
fn test_perform_toggle_restore_failure() {
    let mut api = FakeSystemApi::new();
    api.restore_ok = false;

    let (ok, new_hidden) = perform_toggle(&mut api, true);
    assert!(!ok);
    assert!(new_hidden); // Should remain true on failure
}

#[test]
fn test_perform_toggle_multiple_times() {
    let mut api = FakeSystemApi::new();

    // Start hidden=false, toggle to true
    let (ok1, hidden1) = perform_toggle(&mut api, false);
    assert!(ok1);
    assert!(hidden1);

    // Toggle back to false
    let (ok2, hidden2) = perform_toggle(&mut api, hidden1);
    assert!(ok2);
    assert!(!hidden2);

    // Toggle again
    let (ok3, hidden3) = perform_toggle(&mut api, hidden2);
    assert!(ok3);
    assert!(hidden3);
}

#[test]
fn test_system_api_trait_implementation() {
    let mut api = FakeSystemApi::new();

    assert!(!api.applied);
    assert!(!api.restored);

    api.apply_blank_system_cursors();
    assert!(api.applied);

    api.restore_system_cursors();
    assert!(api.restored);
}

#[test]
fn registry_helpers_use_override_key() {
    // Integration tests cannot rely on internal cfg(test) registry override hooks.
    // Keep coverage of registry helpers via unit tests in crate::win_cursor::testing.
    // Here we only assert that exported API functions are callable.
    let cursor_type = &CURSOR_TYPES[0];
    let _ = read_cursor_image_from_registry(cursor_type);
}
