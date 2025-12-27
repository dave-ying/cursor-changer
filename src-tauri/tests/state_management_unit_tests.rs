/// Unit tests for state management operations
/// Tests state initialization, updates, persistence, and restoration
/// Requirements: 1.5
use cursor_changer_tauri::state::app_state::DEFAULT_SHORTCUT;
use cursor_changer_tauri::state::{
    AppState, CursorStatePayload, CustomizationMode, DefaultCursorStyle, PersistedConfig, ThemeMode,
};
use std::collections::HashMap;
use tempfile::TempDir;

#[test]
fn test_state_initialization_defaults() {
    let state = AppState::default();

    assert_eq!(state.cursor.read().unwrap().hidden, false);
    assert_eq!(
        state.prefs.read().unwrap().shortcut,
        Some(DEFAULT_SHORTCUT.to_string())
    );
    assert_eq!(state.prefs.read().unwrap().shortcut_enabled, true);
    assert_eq!(state.prefs.read().unwrap().run_on_startup, false);
    assert_eq!(state.prefs.read().unwrap().minimize_to_tray, true);
    assert_eq!(state.prefs.read().unwrap().cursor_size, 32);
    assert_eq!(state.cursor.read().unwrap().last_loaded_cursor_path, None);
    assert!(state.cursor.read().unwrap().cursor_paths.is_empty());
    assert!(state
        .modes
        .read()
        .unwrap()
        .simple_mode_cursor_paths
        .is_empty());
    assert!(state
        .modes
        .read()
        .unwrap()
        .advanced_mode_cursor_paths
        .is_empty());
    assert_eq!(
        state.modes.read().unwrap().customization_mode,
        CustomizationMode::Simple
    );
    assert_eq!(state.prefs.read().unwrap().accent_color, "#7c3aed");
    assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::Dark);
}

#[test]
fn test_state_update_hidden() {
    let state = AppState::default();
    assert_eq!(state.cursor.read().unwrap().hidden, false);

    state.cursor.write().unwrap().hidden = true;
    assert_eq!(state.cursor.read().unwrap().hidden, true);

    state.cursor.write().unwrap().hidden = false;
    assert_eq!(state.cursor.read().unwrap().hidden, false);
}

#[test]
fn test_state_update_shortcut() {
    let state = AppState::default();
    assert_eq!(
        state.prefs.read().unwrap().shortcut,
        Some(DEFAULT_SHORTCUT.to_string())
    );

    state.prefs.write().unwrap().shortcut = Some("Ctrl+Shift+C".to_string());
    assert_eq!(
        state.prefs.read().unwrap().shortcut,
        Some("Ctrl+Shift+C".to_string())
    );

    state.prefs.write().unwrap().shortcut = None;
    assert_eq!(state.prefs.read().unwrap().shortcut, None);
}

#[test]
fn test_state_update_cursor_size() {
    let state = AppState::default();
    assert_eq!(state.prefs.read().unwrap().cursor_size, 32);

    state.prefs.write().unwrap().cursor_size = 64;
    assert_eq!(state.prefs.read().unwrap().cursor_size, 64);

    state.prefs.write().unwrap().cursor_size = 128;
    assert_eq!(state.prefs.read().unwrap().cursor_size, 128);
}

#[test]
fn test_state_update_cursor_paths() {
    let state = AppState::default();
    assert!(state.cursor.read().unwrap().cursor_paths.is_empty());

    state
        .cursor
        .write()
        .unwrap()
        .cursor_paths
        .insert("Normal".to_string(), "C:\\test\\cursor.cur".to_string());
    assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 1);
    assert_eq!(
        state.cursor.read().unwrap().cursor_paths.get("Normal"),
        Some(&"C:\\test\\cursor.cur".to_string())
    );

    state
        .cursor
        .write()
        .unwrap()
        .cursor_paths
        .insert("Hand".to_string(), "C:\\test\\hand.cur".to_string());
    assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 2);

    state.cursor.write().unwrap().cursor_paths.clear();
    assert!(state.cursor.read().unwrap().cursor_paths.is_empty());
}

#[test]
fn test_state_update_customization_mode() {
    let state = AppState::default();
    assert_eq!(
        state.modes.read().unwrap().customization_mode,
        CustomizationMode::Simple
    );

    state.modes.write().unwrap().customization_mode = CustomizationMode::Advanced;
    assert_eq!(
        state.modes.read().unwrap().customization_mode,
        CustomizationMode::Advanced
    );

    state.modes.write().unwrap().customization_mode = CustomizationMode::Simple;
    assert_eq!(
        state.modes.read().unwrap().customization_mode,
        CustomizationMode::Simple
    );
}

#[test]
fn test_state_update_theme_mode() {
    let state = AppState::default();
    assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::Dark);

    state.prefs.write().unwrap().theme_mode = ThemeMode::Light;
    assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::Light);

    state.prefs.write().unwrap().theme_mode = ThemeMode::System;
    assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::System);
}

#[test]
fn test_state_update_accent_color() {
    let state = AppState::default();
    assert_eq!(state.prefs.read().unwrap().accent_color, "#7c3aed");

    state.prefs.write().unwrap().accent_color = "#ff0000".to_string();
    assert_eq!(state.prefs.read().unwrap().accent_color, "#ff0000");
}

#[test]
fn test_persisted_config_default() {
    let config = PersistedConfig::default();

    assert_eq!(config.shortcut, None);
    assert_eq!(config.shortcut_enabled, None);
    assert_eq!(config.minimize_to_tray, None);
    assert_eq!(config.run_on_startup, None);
    assert_eq!(config.cursor_size, None);
    assert_eq!(config.accent_color, None);
    assert_eq!(config.theme_mode, None);
    assert_eq!(config.default_cursor_style, None);
}

#[test]
fn test_persisted_config_serialization() {
    let config = PersistedConfig {
        shortcut: Some("Ctrl+Shift+C".to_string()),
        shortcut_enabled: Some(true),
        minimize_to_tray: Some(false),
        run_on_startup: Some(true),
        cursor_size: Some(64),
        accent_color: Some("#ff0000".to_string()),
        theme_mode: Some(ThemeMode::Light),
        default_cursor_style: Some(DefaultCursorStyle::Windows),
    };

    let json = serde_json::to_string(&config).expect("serialize");
    let parsed: PersistedConfig = serde_json::from_str(&json).expect("deserialize");

    assert_eq!(parsed.shortcut, config.shortcut);
    assert_eq!(parsed.shortcut_enabled, config.shortcut_enabled);
    assert_eq!(parsed.minimize_to_tray, config.minimize_to_tray);
    assert_eq!(parsed.run_on_startup, config.run_on_startup);
    assert_eq!(parsed.cursor_size, config.cursor_size);
    assert_eq!(parsed.accent_color, config.accent_color);
    assert_eq!(parsed.theme_mode, config.theme_mode);
    assert_eq!(parsed.default_cursor_style, config.default_cursor_style);
}

#[test]
fn test_persisted_config_persistence_round_trip() {
    let temp_dir = TempDir::new().expect("create temp dir");
    let config_dir = temp_dir.path().join("config");
    std::fs::create_dir_all(&config_dir).expect("create dir");

    let config = PersistedConfig {
        shortcut: Some("Ctrl+Alt+C".to_string()),
        shortcut_enabled: Some(true),
        minimize_to_tray: Some(true),
        run_on_startup: Some(false),
        cursor_size: Some(72),
        accent_color: Some("#0000ff".to_string()),
        theme_mode: Some(ThemeMode::Light),
        default_cursor_style: Some(DefaultCursorStyle::Windows),
    };

    // Write config manually
    let file_path = config_dir.join("config.json");
    let json = serde_json::to_string_pretty(&config).expect("serialize");
    std::fs::write(&file_path, json).expect("write file");

    // Read it back
    let contents = std::fs::read_to_string(&file_path).expect("read file");
    let loaded: PersistedConfig = serde_json::from_str(&contents).expect("parse json");

    // Verify round-trip
    assert_eq!(loaded.shortcut, config.shortcut);
    assert_eq!(loaded.shortcut_enabled, config.shortcut_enabled);
    assert_eq!(loaded.minimize_to_tray, config.minimize_to_tray);
    assert_eq!(loaded.run_on_startup, config.run_on_startup);
    assert_eq!(loaded.cursor_size, config.cursor_size);
    assert_eq!(loaded.default_cursor_style, config.default_cursor_style);
    assert_eq!(loaded.accent_color, config.accent_color);
    assert_eq!(loaded.theme_mode, config.theme_mode);
}

#[test]
fn test_cursor_state_payload_from_app_state() {
    let mut cursor_paths = HashMap::new();
    cursor_paths.insert("Normal".to_string(), "C:\\test\\normal.cur".to_string());
    cursor_paths.insert("Hand".to_string(), "C:\\test\\hand.cur".to_string());

    let state = AppState::default();
    {
        let mut cursor = state.cursor.write().unwrap();
        cursor.hidden = true;
        cursor.last_loaded_cursor_path = Some("C:\\test\\last.cur".to_string());
        cursor.cursor_paths = cursor_paths;
    }
    {
        let mut prefs = state.prefs.write().unwrap();
        prefs.shortcut = Some(DEFAULT_SHORTCUT.to_string());
        prefs.shortcut_enabled = true;
        prefs.minimize_to_tray = false;
        prefs.run_on_startup = false;
        prefs.cursor_size = 64;
        prefs.accent_color = "#ff00ff".to_string();
        prefs.theme_mode = ThemeMode::System;
        prefs.default_cursor_style = DefaultCursorStyle::Windows;
    }
    state.modes.write().unwrap().customization_mode = CustomizationMode::Advanced;

    let payload = CursorStatePayload::try_from(&state).expect("Application state poisoned");

    assert_eq!(payload.hidden, true);
    assert_eq!(payload.shortcut, Some("Ctrl+Shift+X".to_string()));
    assert_eq!(payload.shortcut_enabled, true);
    assert_eq!(payload.minimize_to_tray, false);
    assert_eq!(payload.run_on_startup, false);
    assert_eq!(payload.cursor_size, 64);
    assert_eq!(
        payload.last_loaded_cursor_path,
        Some("C:\\test\\last.cur".to_string())
    );
    assert_eq!(payload.cursor_paths.len(), 2);
    assert_eq!(payload.accent_color, "#ff00ff");
    assert_eq!(payload.theme_mode, ThemeMode::System);
    assert_eq!(payload.default_cursor_style, DefaultCursorStyle::Windows);
}

#[test]
fn test_state_restoration_from_persisted_config() {
    let config = PersistedConfig {
        shortcut: Some("Ctrl+Q".to_string()),
        shortcut_enabled: Some(false),
        minimize_to_tray: Some(true),
        run_on_startup: Some(false),
        cursor_size: Some(80),
        accent_color: Some("#123456".to_string()),
        theme_mode: Some(ThemeMode::Dark),
        default_cursor_style: Some(DefaultCursorStyle::Windows),
    };

    let state = AppState::default();

    // Simulate restoration
    if let Some(shortcut) = config.shortcut {
        state.prefs.write().unwrap().shortcut = Some(shortcut);
    }
    if let Some(enabled) = config.shortcut_enabled {
        state.prefs.write().unwrap().shortcut_enabled = enabled;
    }
    if let Some(minimize) = config.minimize_to_tray {
        state.prefs.write().unwrap().minimize_to_tray = minimize;
    }
    if let Some(startup) = config.run_on_startup {
        state.prefs.write().unwrap().run_on_startup = startup;
    }
    if let Some(size) = config.cursor_size {
        state.prefs.write().unwrap().cursor_size = size;
    }
    if let Some(color) = config.accent_color {
        state.prefs.write().unwrap().accent_color = color;
    }
    if let Some(theme) = config.theme_mode {
        state.prefs.write().unwrap().theme_mode = theme;
    }

    let prefs = state.prefs.read().unwrap();
    assert_eq!(prefs.shortcut, Some("Ctrl+Q".to_string()));
    assert_eq!(prefs.shortcut_enabled, false);
    assert_eq!(prefs.minimize_to_tray, true);
    assert_eq!(prefs.run_on_startup, false);
    assert_eq!(prefs.cursor_size, 80);
    assert_eq!(prefs.accent_color, "#123456");
    assert_eq!(prefs.theme_mode, ThemeMode::Dark);
}

#[test]
fn test_state_mode_specific_cursor_paths() {
    let state = AppState::default();

    // Set simple mode paths
    state
        .modes
        .write()
        .unwrap()
        .simple_mode_cursor_paths
        .insert("Normal".to_string(), "C:\\simple\\normal.cur".to_string());
    assert_eq!(
        state.modes.read().unwrap().simple_mode_cursor_paths.len(),
        1
    );

    // Set advanced mode paths
    state
        .modes
        .write()
        .unwrap()
        .advanced_mode_cursor_paths
        .insert("Normal".to_string(), "C:\\advanced\\normal.cur".to_string());
    state
        .modes
        .write()
        .unwrap()
        .advanced_mode_cursor_paths
        .insert("Hand".to_string(), "C:\\advanced\\hand.cur".to_string());
    assert_eq!(
        state.modes.read().unwrap().advanced_mode_cursor_paths.len(),
        2
    );

    // Verify they're independent
    assert_eq!(
        state.modes.read().unwrap().simple_mode_cursor_paths.len(),
        1
    );
    assert_eq!(
        state.modes.read().unwrap().advanced_mode_cursor_paths.len(),
        2
    );
}

#[test]
fn test_state_multiple_updates_maintain_consistency() {
    let state = AppState::default();

    // Perform multiple updates
    state.prefs.write().unwrap().cursor_size = 48;
    state.cursor.write().unwrap().hidden = true;
    state.prefs.write().unwrap().shortcut = Some("Ctrl+H".to_string());
    state
        .cursor
        .write()
        .unwrap()
        .cursor_paths
        .insert("Normal".to_string(), "C:\\test.cur".to_string());
    state.prefs.write().unwrap().theme_mode = ThemeMode::Light;

    // Verify all updates persisted
    assert_eq!(state.prefs.read().unwrap().cursor_size, 48);
    assert_eq!(state.cursor.read().unwrap().hidden, true);
    assert_eq!(
        state.prefs.read().unwrap().shortcut,
        Some("Ctrl+H".to_string())
    );
    assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 1);
    assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::Light);
}
