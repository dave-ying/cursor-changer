#[cfg(test)]
mod tests {
    use crate::commands::shutdown::restore_state;
    use crate::state::AppState;
    use crate::system::{set_apply_cursor_from_file_with_size_mock_guard, set_restore_mock_guard};

    #[test]
    fn test_restore_state_scenarios() {
        // Scenario 1: Success case
        {
            let _restore_guard = set_restore_mock_guard(|| true);
            let _apply_guard = set_apply_cursor_from_file_with_size_mock_guard(|_, _, _| true);

            let state = AppState::default();
            {
                let mut cursor = state.cursor.write().unwrap();
                cursor.hidden = true;
                cursor
                    .cursor_paths
                    .insert("Normal".into(), "some_path.cur".into());
                cursor.last_loaded_cursor_path = Some("last.cur".into());
            }

            let restored = restore_state(&state);
            assert!(restored);
            let cursor = state.cursor.read().unwrap();
            assert!(!cursor.hidden);
            assert!(cursor.cursor_paths.is_empty());
            assert!(cursor.last_loaded_cursor_path.is_none());
        }

        // Scenario 2: Failure case
        {
            let _restore_guard = set_restore_mock_guard(|| false);
            let state = AppState::default();
            {
                let mut cursor = state.cursor.write().unwrap();
                cursor.hidden = false;
            }

            let restored = restore_state(&state);
            assert!(!restored);
        }
    }
}
