use cursor_changer::{perform_toggle, toggle_action, SystemApi, ToggleAction};

#[test]
fn test_toggle_action_false_gives_apply() {
    assert_eq!(toggle_action(false), ToggleAction::Apply);
}

#[test]
fn test_toggle_action_true_gives_restore() {
    assert_eq!(toggle_action(true), ToggleAction::Restore);
}

#[test]
fn test_toggle_action_idempotent() {
    // Double toggle should return to original action
    let action1 = toggle_action(false);
    let hidden_after_1 = match action1 {
        ToggleAction::Apply => true,
        ToggleAction::Restore => false,
    };

    let action2 = toggle_action(hidden_after_1);
    let hidden_after_2 = match action2 {
        ToggleAction::Apply => true,
        ToggleAction::Restore => false,
    };

    assert!(!hidden_after_2);
}

struct MockSystemApi {
    pub apply_calls: usize,
    pub restore_calls: usize,
    pub apply_success: bool,
    pub restore_success: bool,
}

impl MockSystemApi {
    fn new() -> Self {
        Self {
            apply_calls: 0,
            restore_calls: 0,
            apply_success: true,
            restore_success: true,
        }
    }
}

impl SystemApi for MockSystemApi {
    fn apply_blank_system_cursors(&mut self) -> bool {
        self.apply_calls += 1;
        self.apply_success
    }

    fn restore_system_cursors(&mut self) -> bool {
        self.restore_calls += 1;
        self.restore_success
    }
}

#[test]
fn test_perform_toggle_apply_success() {
    let mut api = MockSystemApi::new();
    api.apply_success = true;

    let (ok, new_hidden) = perform_toggle(&mut api, false);

    assert!(ok);
    assert!(new_hidden);
    assert_eq!(api.apply_calls, 1);
    assert_eq!(api.restore_calls, 0);
}

#[test]
fn test_perform_toggle_apply_failure() {
    let mut api = MockSystemApi::new();
    api.apply_success = false;

    let (ok, new_hidden) = perform_toggle(&mut api, false);

    assert!(!ok);
    assert!(!new_hidden);
    assert_eq!(api.apply_calls, 1);
}

#[test]
fn test_perform_toggle_restore_success() {
    let mut api = MockSystemApi::new();
    api.restore_success = true;

    let (ok, new_hidden) = perform_toggle(&mut api, true);

    assert!(ok);
    assert!(!new_hidden);
    assert_eq!(api.restore_calls, 1);
    assert_eq!(api.apply_calls, 0);
}

#[test]
fn test_perform_toggle_restore_failure() {
    let mut api = MockSystemApi::new();
    api.restore_success = false;

    let (ok, new_hidden) = perform_toggle(&mut api, true);

    assert!(!ok);
    assert!(new_hidden);
    assert_eq!(api.restore_calls, 1);
}

#[test]
fn test_perform_toggle_multiple_times() {
    let mut api = MockSystemApi::new();

    // Start hidden=false, apply
    let (ok1, hidden1) = perform_toggle(&mut api, false);
    assert!(ok1 && hidden1);

    // Restore
    let (ok2, hidden2) = perform_toggle(&mut api, hidden1);
    assert!(ok2 && !hidden2);

    // Apply again
    let (ok3, hidden3) = perform_toggle(&mut api, hidden2);
    assert!(ok3 && hidden3);

    assert_eq!(api.apply_calls, 2);
    assert_eq!(api.restore_calls, 1);
}

#[test]
fn test_perform_toggle_alternating_failures() {
    let mut api = MockSystemApi::new();

    // First toggle fails
    api.apply_success = false;
    let (ok1, hidden1) = perform_toggle(&mut api, false);
    assert!(!ok1 && !hidden1);

    // Second toggle succeeds
    api.apply_success = true;
    let (ok2, hidden2) = perform_toggle(&mut api, hidden1);
    assert!(ok2 && hidden2);
}
