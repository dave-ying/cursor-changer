use crate::commands::command_helpers;
use crate::state::{AppState, CursorStatePayload};
use crate::system::{self, apply_blank_system_cursors};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};

fn hide_cursor_system() -> bool {
    apply_blank_system_cursors()
}

fn show_cursor_system(cursor_paths: &HashMap<String, String>, cursor_size: i32) -> bool {
    let has_custom_cursors = !cursor_paths.is_empty();

    if has_custom_cursors {
        let cursor_types = &cursor_changer::CURSOR_TYPES;
        let mut success = true;

        for cursor_type in cursor_types {
            if let Some(cursor_path) = cursor_paths.get(cursor_type.name) {
                if !system::apply_cursor_from_file_with_size(
                    cursor_path,
                    cursor_type.id,
                    cursor_size,
                ) {
                    cc_warn!(
                        "[CursorChanger] Failed to reapply custom cursor: {}",
                        cursor_type.name
                    );
                    success = false;
                }
            }
        }

        success
    } else {
        system::restore_system_cursors()
    }
}

#[derive(Copy, Clone, Debug)]
#[allow(dead_code)]
enum CursorVisibilityIntent {
    Hide,
    Show,
    Toggle,
    ShowIfHidden,
}

#[derive(Copy, Clone, Debug, PartialEq, Eq)]
enum CursorAction {
    Hide,
    Show,
    Noop,
}

fn decide_cursor_action(intent: CursorVisibilityIntent, currently_hidden: bool) -> CursorAction {
    match intent {
        CursorVisibilityIntent::Hide => CursorAction::Hide,
        CursorVisibilityIntent::Show => CursorAction::Show,
        CursorVisibilityIntent::Toggle => {
            if currently_hidden {
                CursorAction::Show
            } else {
                CursorAction::Hide
            }
        }
        CursorVisibilityIntent::ShowIfHidden => {
            if currently_hidden {
                CursorAction::Show
            } else {
                CursorAction::Noop
            }
        }
    }
}

fn apply_cursor_action_system(
    action: CursorAction,
    currently_hidden: bool,
    cursor_paths: &HashMap<String, String>,
    cursor_size: i32,
) -> Result<bool, String> {
    match action {
        CursorAction::Hide => {
            if hide_cursor_system() {
                Ok(true)
            } else {
                Err("Failed to hide system cursors".into())
            }
        }
        CursorAction::Show => {
            if show_cursor_system(cursor_paths, cursor_size) {
                Ok(false)
            } else {
                Err("Failed to restore cursors".into())
            }
        }
        CursorAction::Noop => Ok(currently_hidden),
    }
}

fn apply_cursor_visibility_intent_with_shared_state(
    shared: &AppState,
    intent: CursorVisibilityIntent,
) -> Result<CursorStatePayload, String> {
    let (currently_hidden, cursor_paths, cursor_size) = {
        let cursor_guard = shared
            .cursor
            .read()
            .map_err(|_| "Application state poisoned".to_string())?;

        let action = decide_cursor_action(intent, cursor_guard.hidden);

        if matches!(action, CursorAction::Noop) {
            return CursorStatePayload::try_from(shared);
        }

        let needs_show_snapshot = matches!(action, CursorAction::Show);

        let cursor_paths = if needs_show_snapshot {
            cursor_guard.cursor_paths.clone()
        } else {
            HashMap::new()
        };

        let currently_hidden = cursor_guard.hidden;
        drop(cursor_guard);

        let prefs_guard = shared
            .prefs
            .read()
            .map_err(|_| "Application state poisoned".to_string())?;

        (currently_hidden, cursor_paths, prefs_guard.cursor_size)
    };

    let action = decide_cursor_action(intent, currently_hidden);
    let new_hidden = apply_cursor_action_system(action, currently_hidden, &cursor_paths, cursor_size)?;

    {
        let mut cursor_guard = shared
            .cursor
            .write()
            .map_err(|_| "Application state poisoned".to_string())?;
        cursor_guard.hidden = new_hidden;
    }

    CursorStatePayload::try_from(shared)
}

#[allow(dead_code)]
pub fn hide_cursor(state: &AppState) -> Result<(), String> {
    let payload =
        apply_cursor_visibility_intent_with_shared_state(state, CursorVisibilityIntent::Hide)?;
    if payload.hidden {
        Ok(())
    } else {
        Err("Failed to hide system cursors".into())
    }
}

#[allow(dead_code)]
pub fn show_cursor(state: &AppState) -> Result<(), String> {
    let payload =
        apply_cursor_visibility_intent_with_shared_state(state, CursorVisibilityIntent::Show)?;
    if !payload.hidden {
        Ok(())
    } else {
        Err("Failed to restore cursors".into())
    }
}

#[allow(dead_code)]
pub fn toggle_cursor_internal(state: &AppState) -> Result<bool, String> {
    let payload =
        apply_cursor_visibility_intent_with_shared_state(state, CursorVisibilityIntent::Toggle)?;
    Ok(payload.hidden)
}

#[tauri::command]
pub fn get_status(state: State<AppState>) -> Result<CursorStatePayload, String> {
    CursorStatePayload::try_from(&*state)
}

#[tauri::command]
pub fn toggle_cursor(app: AppHandle, state: State<AppState>) -> Result<CursorStatePayload, String> {
    let payload = toggle_cursor_with_shared_state(&*state)?;
    let _ = app.emit(crate::events::CURSOR_STATE, payload.clone());
    Ok(payload)
}

#[tauri::command]
pub fn restore_cursor(
    app: AppHandle,
    state: State<AppState>,
) -> Result<CursorStatePayload, String> {
    let payload = show_cursor_if_hidden_with_shared_state(&*state)?;
    let _ = app.emit(crate::events::CURSOR_STATE, payload.clone());
    Ok(payload)
}

pub fn toggle_cursor_with_shared_state(shared: &AppState) -> Result<CursorStatePayload, String> {
    apply_cursor_visibility_intent_with_shared_state(shared, CursorVisibilityIntent::Toggle)
}

pub fn show_cursor_if_hidden_with_shared_state(
    shared: &AppState,
) -> Result<CursorStatePayload, String> {
    apply_cursor_visibility_intent_with_shared_state(shared, CursorVisibilityIntent::ShowIfHidden)
}

#[allow(dead_code)]
pub fn toggle_app_enabled_internal(
    app: &AppHandle,
    state: &State<AppState>,
) -> Result<CursorStatePayload, String> {
    command_helpers::update_state_and_emit(app, state, true, |guard| {
        guard.prefs.app_enabled = !guard.prefs.app_enabled;
        Ok(())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::system::{
        set_apply_blank_mock_guard, set_apply_cursor_from_file_with_size_mock_guard,
        set_restore_mock_guard,
    };

    #[test]
    fn decide_cursor_action_covers_all_intents() {
        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::Hide, false),
            CursorAction::Hide
        );
        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::Hide, true),
            CursorAction::Hide
        );

        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::Show, false),
            CursorAction::Show
        );
        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::Show, true),
            CursorAction::Show
        );

        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::Toggle, false),
            CursorAction::Hide
        );
        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::Toggle, true),
            CursorAction::Show
        );

        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::ShowIfHidden, false),
            CursorAction::Noop
        );
        assert_eq!(
            decide_cursor_action(CursorVisibilityIntent::ShowIfHidden, true),
            CursorAction::Show
        );
    }

    #[test]
    fn test_cursor_commands_scenarios() {
        // Scenario 1: hide_cursor_sets_hidden_on_success
        {
            let _apply_guard = set_apply_blank_mock_guard(|| true);
            let state = AppState::default();
            {
                let mut cursor = state.cursor.write().unwrap();
                cursor.hidden = false;
            }

            assert!(hide_cursor(&state).is_ok());
            assert!(state.cursor.read().unwrap().hidden);
        }

        // Scenario 2: hide_cursor_returns_error_on_failure
        {
            let _apply_guard = set_apply_blank_mock_guard(|| false);
            let state = AppState::default();

            let result = hide_cursor(&state);
            assert!(result.is_err());
            assert!(!state.cursor.read().unwrap().hidden);
        }

        // Scenario 3: show_cursor_clears_hidden_on_success
        {
            let _restore_guard = set_restore_mock_guard(|| true);
            let state = AppState::default();
            {
                let mut cursor = state.cursor.write().unwrap();
                cursor.hidden = true;
            }

            assert!(show_cursor(&state).is_ok());
            assert!(!state.cursor.read().unwrap().hidden);
        }

        // Scenario 4: toggle_cursor_internal_switches_both_directions
        {
            let _apply_guard = set_apply_blank_mock_guard(|| true);
            let _restore_guard = set_restore_mock_guard(|| true);
            let state = AppState::default();

            // First toggle hides
            let hidden = toggle_cursor_internal(&state).expect("first toggle");
            assert!(hidden);
            assert!(state.cursor.read().unwrap().hidden);

            // Second toggle shows
            let hidden = toggle_cursor_internal(&state).expect("second toggle");
            assert!(!hidden);
            assert!(!state.cursor.read().unwrap().hidden);
        }

        // Scenario 5: show_cursor_reapplies_custom_cursors
        {
            use std::collections::HashMap;
            use std::sync::Arc;
            use std::sync::Mutex as StdMutex;

            let call_count = Arc::new(StdMutex::new(0));
            let count_clone = Arc::clone(&call_count);

            let _apply_single_guard =
                set_apply_cursor_from_file_with_size_mock_guard(move |_path, _id, _size| {
                    *count_clone.lock().unwrap() += 1;
                    true
                });

            let mut cursor_paths = HashMap::new();
            cursor_paths.insert("Normal".to_string(), "C:\\test\\cursor.cur".to_string());

            let state = AppState::default();
            {
                let mut cursor = state.cursor.write().unwrap();
                cursor.hidden = true;
                cursor.cursor_paths = cursor_paths;
            }
            {
                let mut prefs = state.prefs.write().unwrap();
                prefs.cursor_size = 48;
            }

            let result = show_cursor(&state);
            assert!(result.is_ok());
            assert!(!state.cursor.read().unwrap().hidden);

            // Verify the cursor was applied
            assert!(*call_count.lock().unwrap() > 0);
        }

        // Scenario 6: toggle_cursor_internal_returns_new_hidden_state
        {
            let _apply_guard = set_apply_blank_mock_guard(|| true);
            let _restore_guard = set_restore_mock_guard(|| true);
            let mut state = AppState::default();

            // Toggle to hidden
            let result = toggle_cursor_internal(&state).expect("toggle 1");
            assert_eq!(result, true); // Returns new hidden state

            // Toggle to visible
            let result = toggle_cursor_internal(&state).expect("toggle 2");
            assert_eq!(result, false); // Returns new hidden state
        }

        // Scenario 7: hide_cursor_with_custom_cursors_still_hides
        {
            use std::collections::HashMap;
            let _apply_guard = set_apply_blank_mock_guard(|| true);

            let mut cursor_paths = HashMap::new();
            cursor_paths.insert("Normal".to_string(), "C:\\test\\cursor.cur".to_string());

            let state = AppState::default();
            {
                let mut cursor = state.cursor.write().unwrap();
                cursor.cursor_paths = cursor_paths;
            }

            let result = hide_cursor(&state);
            assert!(result.is_ok());
            assert!(state.cursor.read().unwrap().hidden);
        }

        // Scenario 8: toggle_preserves_cursor_size
        {
            let _apply_guard = set_apply_blank_mock_guard(|| true);
            let _restore_guard = set_restore_mock_guard(|| true);
            let state = AppState::default();
            {
                let mut prefs = state.prefs.write().unwrap();
                prefs.cursor_size = 96;
            }

            toggle_cursor_internal(&state).expect("toggle");
            assert_eq!(state.prefs.read().unwrap().cursor_size, 96);

            toggle_cursor_internal(&state).expect("toggle");
            assert_eq!(state.prefs.read().unwrap().cursor_size, 96);
        }
    }
}
