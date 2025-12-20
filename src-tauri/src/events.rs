/// Centralized event name constants for Tauri emit calls.
/// These must match the frontend `Events` object in `frontend-vite/src/tauri/events.ts`.

pub const CURSOR_STATE: &str = "cursor-state";
pub const CURSOR_ERROR: &str = "cursor-error";
pub const THEME_CHANGED: &str = "theme-changed";
pub const RESET_CURSORS_AFTER_SETTINGS: &str = "reset-cursors-after-settings";
pub const SHOW_CLOSE_CONFIRMATION: &str = "show-close-confirmation";
pub const LIBRARY_FILE_ADDED: &str = "library:file-added";
pub const LIBRARY_FILE_REMOVED: &str = "library:file-removed";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_names_match_frontend_conventions() {
        assert_eq!(CURSOR_STATE, "cursor-state");
        assert_eq!(CURSOR_ERROR, "cursor-error");
        assert_eq!(THEME_CHANGED, "theme-changed");
        assert_eq!(RESET_CURSORS_AFTER_SETTINGS, "reset-cursors-after-settings");
        assert_eq!(SHOW_CLOSE_CONFIRMATION, "show-close-confirmation");
        assert_eq!(LIBRARY_FILE_ADDED, "library:file-added");
        assert_eq!(LIBRARY_FILE_REMOVED, "library:file-removed");
    }
}
