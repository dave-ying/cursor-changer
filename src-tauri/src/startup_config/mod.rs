mod apply;
mod autostart;
mod load;
mod normalize;

use crate::commands::customization::defaults::load_app_default_cursors;
use crate::state::config::persist_config;
use crate::state::{AppState, MinimizePreference, PersistedConfig};
use tauri::{AppHandle, Emitter, State};

pub fn load_and_apply_config(
    app: &AppHandle,
    state: &State<AppState>,
    preference: &State<MinimizePreference>,
) -> PersistedConfig {
    let persisted_config = load::load(app);

    let mut needs_autostart_validation = false;
    let mut repaired_autostart = false;
    let mut snapshot_for_persist: Option<PersistedConfig> = None;

    if let Ok(prefs) = state.prefs.read() {
        needs_autostart_validation = prefs.run_on_startup;
    }

    if needs_autostart_validation {
        match autostart::validate_and_repair(app, "CursorChanger") {
            autostart::AutostartRepairResult::NoChange => {}
            autostart::AutostartRepairResult::DisabledInvalidEntry => {
                repaired_autostart = true;
            }
        }
    }

    if let Ok(mut guard) = state.write_all() {
        apply::apply_minimize_to_tray_config(&mut guard, &persisted_config, preference);
        apply::apply_cursor_size_config(&mut guard, &persisted_config);
        apply::apply_accent_color_config(&mut guard, &persisted_config);
        apply::apply_theme_mode_config(&mut guard, &persisted_config);
        apply::apply_shortcut_enabled_config(&mut guard, &persisted_config);
        apply::apply_app_shortcut_config(&mut guard, &persisted_config);
        apply::apply_app_shortcut_enabled_config(&mut guard, &persisted_config);
        apply::apply_app_enabled_config(&mut guard, &persisted_config);
        apply::apply_customization_mode_config(&mut guard, &persisted_config);
        apply::apply_run_on_startup_config(&mut guard, &persisted_config);
        apply::apply_default_cursor_style_config(&mut guard, &persisted_config);

        if repaired_autostart {
            guard.prefs.run_on_startup = false;
        }
        snapshot_for_persist = Some(apply::snapshot_persisted_config_from_state(&guard));
    }

    if repaired_autostart {
        let _ = app.emit(
            crate::events::CURSOR_ERROR,
            "Run at startup entry was invalid and has been disabled",
        );
    }

    if let Some(cfg) = snapshot_for_persist {
        if let Err(e) = persist_config(app, &cfg) {
            cc_error!("Failed to persist normalized config on startup: {}", e);
        }
    }

    persisted_config
}

pub fn load_default_cursors(app: AppHandle, state: State<AppState>) {
    match load_app_default_cursors(app, state) {
        Ok(_) => cc_debug!("[CursorChanger] Successfully loaded app default cursors"),
        Err(e) => cc_error!("[CursorChanger] Failed to load app default cursors: {}", e),
    }
}

#[cfg(test)]
mod tests {
    use super::apply;
    use crate::state::{AppState, MinimizePreference, PersistedConfig};
    use std::sync::atomic::Ordering;

    #[test]
    fn test_apply_cursor_size_config_with_persisted_value() {
        let state = AppState::default();
        assert_eq!(state.prefs.read().unwrap().cursor_size, 32);

        let config = PersistedConfig {
            cursor_size: Some(128),
            ..Default::default()
        };

        let mut guard = state.write_all().expect("write state");
        apply::apply_cursor_size_config(&mut guard, &config);
        assert_eq!(
            guard.prefs.cursor_size, 128,
            "Cursor size should be updated from persisted config"
        );
    }

    #[test]
    fn test_apply_cursor_size_config_without_persisted_value() {
        let state = AppState::default();
        assert_eq!(state.prefs.read().unwrap().cursor_size, 32);

        let config = PersistedConfig {
            cursor_size: None,
            ..Default::default()
        };

        let mut guard = state.write_all().expect("write state");
        apply::apply_cursor_size_config(&mut guard, &config);
        assert_eq!(
            guard.prefs.cursor_size, 32,
            "Cursor size should remain default when not in config"
        );
    }

    #[test]
    fn test_apply_cursor_size_config_preserves_custom_size() {
        let state = AppState::default();
        state.prefs.write().unwrap().cursor_size = 64; // User previously set to 64

        let config = PersistedConfig {
            cursor_size: Some(96), // But config says 96
            ..Default::default()
        };

        let mut guard = state.write_all().expect("write state");
        apply::apply_cursor_size_config(&mut guard, &config);
        assert_eq!(
            guard.prefs.cursor_size, 96,
            "Config value should override state default"
        );
    }

    #[test]
    fn test_cursor_size_restoration_on_startup() {
        let state = AppState::default();
        assert_eq!(
            state.prefs.read().unwrap().cursor_size,
            32,
            "Fresh app starts with 32px"
        );

        let persisted_config = PersistedConfig {
            cursor_size: Some(128),
            minimize_to_tray: Some(true),
            run_on_startup: Some(false),
            ..Default::default()
        };

        let mut guard = state.write_all().expect("write state");
        apply::apply_cursor_size_config(&mut guard, &persisted_config);

        assert_eq!(
            guard.prefs.cursor_size, 128,
            "After config load, cursor size should be 128px"
        );
    }

    #[test]
    fn test_multiple_cursor_size_changes_last_wins() {
        let state = AppState::default();

        let config1 = PersistedConfig {
            cursor_size: Some(64),
            ..Default::default()
        };
        let mut guard = state.write_all().expect("write state");
        apply::apply_cursor_size_config(&mut guard, &config1);
        assert_eq!(guard.prefs.cursor_size, 64);

        let config2 = PersistedConfig {
            cursor_size: Some(128),
            ..Default::default()
        };
        apply::apply_cursor_size_config(&mut guard, &config2);
        assert_eq!(guard.prefs.cursor_size, 128);

        let config3 = PersistedConfig {
            cursor_size: Some(48),
            ..Default::default()
        };
        apply::apply_cursor_size_config(&mut guard, &config3);
        assert_eq!(guard.prefs.cursor_size, 48);
    }

    #[test]
    fn test_apply_minimize_to_tray_config_with_preference() {
        let state = AppState::default();
        let preference = MinimizePreference::default();

        let config = PersistedConfig {
            minimize_to_tray: Some(false),
            ..Default::default()
        };

        let mut guard = state.write_all().expect("write state");
        apply::apply_minimize_to_tray_config(&mut guard, &config, &preference);

        assert_eq!(guard.prefs.minimize_to_tray, false);
        assert_eq!(preference.0.load(Ordering::SeqCst), false);
    }

    #[test]
    fn test_apply_accent_color_config() {
        let state = AppState::default();
        assert_eq!(state.prefs.read().unwrap().accent_color, "#7c3aed");

        let config = PersistedConfig {
            accent_color: Some("#ff5733".to_string()),
            ..Default::default()
        };

        let mut guard = state.write_all().expect("write state");
        apply::apply_accent_color_config(&mut guard, &config);
        assert_eq!(guard.prefs.accent_color, "#ff5733");
    }
}
