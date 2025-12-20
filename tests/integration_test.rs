use cursor_changer::to_wide;

#[test]
fn integration_to_wide_roundtrip() {
    let orig = "Integration — ✅🎯";
    let w = to_wide(orig);
    assert_eq!(w.last(), Some(&0u16));
    let s = String::from_utf16(&w[..w.len() - 1]).expect("valid UTF-16");
    assert_eq!(s, orig);
}

#[test]
fn integration_cursor_types_complete() {
    use cursor_changer::CURSOR_TYPES;

    // Verify all 15 cursor types are defined
    assert_eq!(CURSOR_TYPES.len(), 15);

    // Each should have unique ID and non-empty strings
    for cursor_type in &CURSOR_TYPES {
        assert!(cursor_type.id > 0);
        assert!(!cursor_type.name.is_empty());
        assert!(!cursor_type.registry_key.is_empty());
        assert!(!cursor_type.display_name.is_empty());
    }
}

#[test]
fn integration_toggle_action_logic() {
    use cursor_changer::{toggle_action, ToggleAction};

    assert_eq!(toggle_action(false), ToggleAction::Apply);
    assert_eq!(toggle_action(true), ToggleAction::Restore);
}

#[test]
fn integration_system_api_trait() {
    use cursor_changer::{perform_toggle, SystemApi};

    struct TestApi {
        apply_count: usize,
        restore_count: usize,
    }

    impl SystemApi for TestApi {
        fn apply_blank_system_cursors(&mut self) -> bool {
            self.apply_count += 1;
            true
        }

        fn restore_system_cursors(&mut self) -> bool {
            self.restore_count += 1;
            true
        }
    }

    let mut api = TestApi {
        apply_count: 0,
        restore_count: 0,
    };

    // Apply
    let (ok, hidden) = perform_toggle(&mut api, false);
    assert!(ok);
    assert!(hidden);
    assert_eq!(api.apply_count, 1);

    // Restore
    let (ok, hidden) = perform_toggle(&mut api, true);
    assert!(ok);
    assert!(!hidden);
    assert_eq!(api.restore_count, 1);
}

#[test]
fn integration_build_tip_buffer() {
    use cursor_changer::build_tip_buffer;

    let buf = build_tip_buffer("Test Tooltip");
    assert_eq!(buf.len(), 128);

    // Find NUL terminator
    let nul_pos = buf.iter().position(|&c| c == 0u16).expect("NUL not found");

    // Decode the string before NUL
    let decoded = String::from_utf16(&buf[..nul_pos]).expect("valid UTF-16");
    assert_eq!(decoded, "Test Tooltip");
}

#[test]
fn integration_copy_tip_to_buf() {
    use cursor_changer::copy_tip_to_buf;

    let mut buf = [0u16; 50];
    let written = copy_tip_to_buf("Integration Test", &mut buf);

    assert!(written > 0);
    assert_eq!(buf[written - 1], 0u16); // NUL terminator

    let decoded = String::from_utf16(&buf[..written - 1]).expect("valid UTF-16");
    assert_eq!(decoded, "Integration Test");
}

#[test]
fn integration_to_wide_empty_string() {
    let w = to_wide("");
    assert_eq!(w.len(), 1);
    assert_eq!(w[0], 0u16);
}

#[test]
fn integration_to_wide_long_string() {
    let long = "a".repeat(1000);
    let w = to_wide(&long);

    // Should have 1000 chars + 1 NUL
    assert_eq!(w.len(), 1001);
    assert_eq!(w.last(), Some(&0u16));
}

#[cfg(windows)]
#[test]
fn integration_get_windows_cursors_folder() {
    use cursor_changer::get_windows_cursors_folder;

    let folder = get_windows_cursors_folder();

    // On Windows, this should return a path
    if let Some(path) = folder {
        assert!(path.contains("Cursors"));
        assert!(path.contains(":\\"));
    }
}

#[test]
fn integration_cursor_types_ids_are_valid() {
    use cursor_changer::CURSOR_TYPES;

    // Every cursor type should have a valid non-zero ID
    for cursor_type in &CURSOR_TYPES {
        assert!(cursor_type.id > 0);
        assert!(cursor_type.id >= 32512); // Standard Windows cursor IDs
    }
}

#[test]
fn integration_perform_toggle_error_handling() {
    use cursor_changer::{perform_toggle, SystemApi};

    struct FailingApi;

    impl SystemApi for FailingApi {
        fn apply_blank_system_cursors(&mut self) -> bool {
            false
        }

        fn restore_system_cursors(&mut self) -> bool {
            false
        }
    }

    let mut api = FailingApi;

    // Apply fails
    let (ok, hidden) = perform_toggle(&mut api, false);
    assert!(!ok);
    assert!(!hidden); // Should remain false

    // Restore fails
    let (ok, hidden) = perform_toggle(&mut api, true);
    assert!(!ok);
    assert!(hidden); // Should remain true
}
