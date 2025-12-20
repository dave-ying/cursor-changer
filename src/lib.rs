//! Library helpers extracted from `src/main.rs`.
//!
//! This crate exposes low-level cursor manipulation helpers so other
//! binaries (CLI) and a future Tauri backend can call them.

#![allow(non_upper_case_globals)]

mod win_common;
pub mod win_cursor;
pub mod win_runtime;

pub use win_common::{build_tip_buffer, copy_tip_to_buf, to_wide};
pub use win_cursor::{
    apply_blank_system_cursors, apply_cursor_file_with_size, apply_cursor_from_file_with_size,
    clear_cursor_registry_entries, find_cursor_file_in_dir, find_default_cursor_in_dir,
    get_default_cursor_base_name, get_default_cursor_file, get_windows_cursors_folder,
    perform_toggle, read_cursor_image_from_registry, refresh_cursor_settings,
    restore_cursor_registry_entries, restore_system_cursors, snapshot_cursor_registry_entries,
    toggle_action, write_cursor_image_to_registry, CursorType, SystemApi, ToggleAction,
    CURSOR_EXTENSIONS, CURSOR_TYPES, DEFAULT_CURSOR_BASE_NAMES, DEFAULT_CURSOR_FILES,
};

pub use win_runtime::run_app;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::win_cursor::{
        clear_refresh_cursor_settings_mock, set_refresh_cursor_settings_mock,
        set_test_cursor_registry_path, CURSOR_DIMENSION, CURSOR_IDS, CURSOR_PLANE_BYTES,
    };
    use std::sync::atomic::{AtomicUsize, Ordering};

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
        // sanity check derived constant used for plane buffers
        let expected = (CURSOR_DIMENSION as usize / 8) * (CURSOR_DIMENSION as usize);
        assert_eq!(CURSOR_PLANE_BYTES, expected);
        // simple expectations about cursor dimension
        assert_eq!(CURSOR_PLANE_BYTES % (CURSOR_DIMENSION as usize), 0);
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
        // Ensure CURSOR_IDS contains all 15 cursor types
        assert_eq!(CURSOR_IDS.len(), 15);

        // Verify no duplicates
        let mut sorted = CURSOR_IDS;
        sorted.sort_unstable();
        for i in 1..sorted.len() {
            assert_ne!(sorted[i - 1], sorted[i], "Duplicate cursor ID found");
        }
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
        // Every ID in CURSOR_IDS should be in CURSOR_TYPES
        for &id in &CURSOR_IDS {
            let found = CURSOR_TYPES.iter().any(|ct| ct.id == id);
            assert!(found, "Cursor ID {id} not found in CURSOR_TYPES");
        }
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
        // For 32x32 cursor, we need 128 bytes per plane
        assert_eq!(CURSOR_PLANE_BYTES, 128);
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

    static REG_COUNTER: AtomicUsize = AtomicUsize::new(0);

    #[test]
    fn registry_helpers_use_override_key() {
        let index = REG_COUNTER.fetch_add(1, Ordering::Relaxed);
        let key_path = format!("Software\\CursorChangerTests\\{index}");
        let hkcu = winreg::RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
        let (subkey, _) = hkcu.create_subkey(&key_path).expect("create subkey");

        set_test_cursor_registry_path(Some(key_path.clone()));
        set_refresh_cursor_settings_mock(|| true);

        let cursor_type = &CURSOR_TYPES[0];
        let sample_path = "C:\\Temp\\test.cur";

        assert!(write_cursor_image_to_registry(cursor_type, sample_path));
        assert_eq!(
            read_cursor_image_from_registry(cursor_type).as_deref(),
            Some(sample_path)
        );

        assert!(clear_cursor_registry_entries());
        let value: String = subkey
            .get_value(cursor_type.registry_key)
            .unwrap_or_default();
        assert!(value.is_empty());

        clear_refresh_cursor_settings_mock();
        set_test_cursor_registry_path(None);
        let _ = hkcu.delete_subkey_all(&key_path);
    }
}
