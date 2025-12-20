/// Simple enum describing the toggling action the app should take given the
/// current hidden state. This isolates the pure decision logic for easier testing.
#[derive(Debug, PartialEq, Eq)]
pub enum ToggleAction {
    Apply,
    Restore,
}

#[must_use]
pub const fn toggle_action(hidden: bool) -> ToggleAction {
    if hidden {
        ToggleAction::Restore
    } else {
        ToggleAction::Apply
    }
}

/// Trait abstracting system interactions so we can unit-test toggle logic.
pub trait SystemApi {
    /// Replace system cursors with blank cursor. Returns true on success.
    fn apply_blank_system_cursors(&mut self) -> bool;
    /// Restore system cursors. Returns true on success.
    fn restore_system_cursors(&mut self) -> bool;
}

/// Perform toggle using a `SystemApi` implementation. Returns true if the
/// operation succeeded and the new hidden state (true = hidden).
pub fn perform_toggle(api: &mut dyn SystemApi, currently_hidden: bool) -> (bool, bool) {
    match toggle_action(currently_hidden) {
        ToggleAction::Apply => {
            let ok = api.apply_blank_system_cursors();
            (ok, ok)
        }
        ToggleAction::Restore => {
            let ok = api.restore_system_cursors();
            let new_hidden = if ok { false } else { currently_hidden };
            (ok, new_hidden)
        }
    }
}
