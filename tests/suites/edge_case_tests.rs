use cursor_changer::{copy_tip_to_buf, perform_toggle, to_wide, SystemApi};

#[test]
fn test_to_wide_with_nulls() {
    let input = "Test\0embedded\0nulls";
    let result = to_wide(input);
    // Should convert but have multiple NULs
    assert!(result.contains(&0u16));
}

#[test]
fn test_copy_tip_zero_length_buffer() {
    let mut buf = [];
    let written = copy_tip_to_buf("Test", &mut buf);
    assert_eq!(written, 0);
}

#[test]
fn test_copy_tip_one_char_buffer() {
    let mut buf = [0u16; 1];
    let written = copy_tip_to_buf("Test", &mut buf);
    assert!(written <= 1);
}

#[test]
fn test_perform_toggle_with_multiple_state_flips() {
    struct FlipApi {
        call_count: usize,
    }

    impl SystemApi for FlipApi {
        fn apply_blank_system_cursors(&mut self) -> bool {
            self.call_count += 1;
            self.call_count % 2 == 1 // Succeed on odd calls
        }

        fn restore_system_cursors(&mut self) -> bool {
            self.call_count += 1;
            self.call_count % 2 == 1 // Succeed on odd calls
        }
    }

    let mut api = FlipApi { call_count: 0 };

    let (ok1, _) = perform_toggle(&mut api, false);
    assert!(ok1); // First call succeeds

    let (ok2, _) = perform_toggle(&mut api, true);
    assert!(!ok2); // Second call fails

    let (ok3, _) = perform_toggle(&mut api, true);
    assert!(ok3); // Third call succeeds
}
