use crate::state::{MinimizePreference, PersistedConfig};
use std::sync::atomic::Ordering;

pub(super) fn apply_minimize_to_tray_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
    preference: &MinimizePreference,
) {
    if let Some(minimize_pref) = config.minimize_to_tray {
        cc_debug!(
            "[CursorChanger] Applying persisted minimize_to_tray={} to state",
            minimize_pref
        );
        guard.prefs.minimize_to_tray = minimize_pref;
    } else {
        cc_debug!(
            "[CursorChanger] No persisted minimize_to_tray value; using state default={}",
            guard.prefs.minimize_to_tray
        );
    }
    preference
        .0
        .store(guard.prefs.minimize_to_tray, Ordering::SeqCst);
    cc_debug!(
        "[CursorChanger] MinimizePreference atomic initialized to={}",
        preference.0.load(Ordering::SeqCst)
    );
}

pub(super) fn apply_cursor_size_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
) {
    if let Some(size) = config.cursor_size {
        cc_debug!(
            "[CursorChanger] Applying persisted cursor_size={} to state",
            size
        );
        guard.prefs.cursor_size = size;
    } else {
        cc_debug!(
            "[CursorChanger] No persisted cursor_size value; using state default={}",
            guard.prefs.cursor_size
        );
    }
}

pub(super) fn apply_accent_color_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
) {
    if let Some(color) = &config.accent_color {
        cc_debug!(
            "[CursorChanger] Applying persisted accent_color={} to state",
            color
        );
        guard.prefs.accent_color = color.clone();
    } else {
        cc_debug!(
            "[CursorChanger] No persisted accent_color value; using state default={}",
            guard.prefs.accent_color
        );
    }
}

pub(super) fn apply_theme_mode_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
) {
    if let Some(mode) = &config.theme_mode {
        cc_debug!(
            "[CursorChanger] Applying persisted theme_mode={} to state",
            mode.as_str()
        );
        guard.prefs.theme_mode = mode.clone();
    } else {
        cc_debug!(
            "[CursorChanger] No persisted theme_mode value; using state default={}",
            guard.prefs.theme_mode.as_str()
        );
    }
}

pub(super) fn apply_shortcut_enabled_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
) {
    if let Some(enabled) = config.shortcut_enabled {
        cc_debug!(
            "[CursorChanger] Applying persisted shortcut_enabled={} to state",
            enabled
        );
        guard.prefs.shortcut_enabled = enabled;
    } else {
        cc_debug!(
            "[CursorChanger] No persisted shortcut_enabled value; using state default={}",
            guard.prefs.shortcut_enabled
        );
    }
}

pub(super) fn apply_default_cursor_style_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
) {
    if let Some(style) = &config.default_cursor_style {
        cc_debug!(
            "[CursorChanger] Applying persisted default_cursor_style={} to state",
            style.as_str()
        );
        guard.prefs.default_cursor_style = style.clone();
    } else {
        cc_debug!(
            "[CursorChanger] No persisted default_cursor_style value; using state default={}",
            guard.prefs.default_cursor_style.as_str()
        );
    }
}

pub(super) fn apply_customization_mode_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
) {
    if let Some(mode) = &config.customization_mode {
        cc_debug!(
            "[CursorChanger] Applying persisted customization_mode={} to state",
            mode.as_str()
        );
        guard.modes.customization_mode = *mode;
    } else {
        cc_debug!(
            "[CursorChanger] No persisted customization_mode value; using state default={}",
            guard.modes.customization_mode.as_str()
        );
    }
}

pub(super) fn apply_run_on_startup_config(
    guard: &mut crate::state::app_state::AppStateWriteGuard<'_>,
    config: &PersistedConfig,
) {
    if let Some(run_pref) = config.run_on_startup {
        cc_debug!(
            "[CursorChanger] Applying persisted run_on_startup={} to state",
            run_pref
        );
        guard.prefs.run_on_startup = run_pref;
    } else {
        cc_debug!(
            "[CursorChanger] No persisted run_on_startup value; using state default={}",
            guard.prefs.run_on_startup
        );
    }
}

pub(super) fn snapshot_persisted_config_from_state(
    state: &crate::state::app_state::AppStateWriteGuard<'_>,
) -> PersistedConfig {
    PersistedConfig {
        shortcut: state.prefs.shortcut.clone(),
        shortcut_enabled: Some(state.prefs.shortcut_enabled),
        minimize_to_tray: Some(state.prefs.minimize_to_tray),
        run_on_startup: Some(state.prefs.run_on_startup),
        cursor_size: Some(state.prefs.cursor_size),
        accent_color: Some(state.prefs.accent_color.clone()),
        theme_mode: Some(state.prefs.theme_mode),
        default_cursor_style: Some(state.prefs.default_cursor_style),
        customization_mode: Some(state.modes.customization_mode),
    }
}
