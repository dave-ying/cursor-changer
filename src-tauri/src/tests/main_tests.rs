/// Extracted test module from main.rs
/// Tests configuration, app state, and various utilities
#[cfg(test)]
mod tests {
    use crate::state::{
        app_state::DEFAULT_SHORTCUT,
        config::{normalize_persisted_config, write_config},
        AppState, DefaultCursorStyle, MinimizePreference, PersistedConfig, ThemeMode,
    };
    use std::fs;

    #[test]
    fn normalize_sets_default_minimize() {
        use crate::state::config::*;
        let cfg = PersistedConfig {
            shortcut: None,
            shortcut_enabled: None,
            minimize_to_tray: None,
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };

        let normalized = normalize_persisted_config(cfg);
        assert_eq!(normalized.minimize_to_tray, Some(true));
        assert_eq!(normalized.cursor_size, Some(32));
        assert_eq!(normalized.shortcut_enabled, Some(true));
        assert_eq!(normalized.shortcut, Some(DEFAULT_SHORTCUT.to_string()));
    }

    #[test]
    fn persisted_config_roundtrip() {
        use crate::state::PersistedConfig;
        let cfg = PersistedConfig {
            shortcut: Some("Ctrl+Shift+Z".to_string()),
            shortcut_enabled: Some(true),
            minimize_to_tray: Some(false),
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };

        let s = serde_json::to_string(&cfg).expect("serialize");
        let parsed: PersistedConfig = serde_json::from_str(&s).expect("deserialize");
        assert_eq!(parsed.shortcut, cfg.shortcut);
        assert_eq!(parsed.minimize_to_tray, cfg.minimize_to_tray);
    }

    #[test]
    fn cursor_state_payload_from_app_state() {
        use crate::state::CursorStatePayload;
        let state = AppState::default();
        {
            let mut cursor = state.cursor.write().unwrap();
            cursor.hidden = true;
        }
        {
            let mut prefs = state.prefs.write().unwrap();
            prefs.shortcut = Some("Ctrl+Shift+X".to_string());
            prefs.shortcut_enabled = true;
            prefs.minimize_to_tray = false;
            prefs.run_on_startup = false;
            prefs.cursor_size = 256;
            prefs.accent_color = "#7c3aed".to_string();
            prefs.theme_mode = ThemeMode::System;
            prefs.default_cursor_style = DefaultCursorStyle::Windows;
        }

        let payload = CursorStatePayload::from(&state);
        assert_eq!(payload.hidden, true);
        assert_eq!(payload.shortcut, Some("Ctrl+Shift+X".to_string()));
        assert_eq!(payload.shortcut_enabled, true);
        assert_eq!(payload.minimize_to_tray, false);
        assert_eq!(payload.default_cursor_style, DefaultCursorStyle::Windows);
    }

    #[test]
    fn write_config_creates_file() {
        use crate::state::config::*;
        use crate::state::PersistedConfig;
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();

        let cfg = PersistedConfig {
            shortcut: Some("Ctrl+Alt+T".to_string()),
            shortcut_enabled: Some(true),
            minimize_to_tray: Some(false),
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };

        let result = write_config(&dir, &cfg);
        assert!(result.is_ok());

        let file = dir.join("config.json");
        assert!(file.exists());

        let s = fs::read_to_string(&file).expect("read");
        let parsed: PersistedConfig = serde_json::from_str(&s).expect("parse");
        assert_eq!(parsed.shortcut, cfg.shortcut);
        assert_eq!(parsed.minimize_to_tray, cfg.minimize_to_tray);
    }

    // Additional comprehensive tests
    #[test]
    fn test_app_state_default() {
        let state = AppState::default();
        assert_eq!(state.cursor.read().unwrap().hidden, false);
        assert_eq!(
            state.prefs.read().unwrap().shortcut,
            Some(DEFAULT_SHORTCUT.to_string())
        );
        assert_eq!(state.prefs.read().unwrap().minimize_to_tray, true);
    }

    #[test]
    fn test_persisted_config_default() {
        use crate::state::PersistedConfig;
        let config = PersistedConfig::default();
        assert_eq!(config.shortcut, None);
        assert_eq!(config.minimize_to_tray, None);
    }

    #[test]
    fn test_write_config_overwrites_existing() {
        use crate::state::config::*;
        use crate::state::PersistedConfig;
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();

        let config1 = PersistedConfig {
            shortcut: Some("Ctrl+Old".to_string()),
            shortcut_enabled: None,
            minimize_to_tray: Some(false),
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };

        write_config(&dir, &config1).expect("first write");

        let config2 = PersistedConfig {
            shortcut: Some("Ctrl+New".to_string()),
            shortcut_enabled: None,
            minimize_to_tray: Some(true),
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };

        write_config(&dir, &config2).expect("second write");

        let contents = std::fs::read_to_string(dir.join("config.json")).expect("read");
        assert!(contents.contains("Ctrl+New"));
        assert!(!contents.contains("Ctrl+Old"));
    }

    #[test]
    fn test_minimize_preference_default() {
        use std::sync::atomic::Ordering;
        let pref = MinimizePreference::default();
        assert_eq!(pref.0.load(Ordering::SeqCst), true);
    }

    #[test]
    fn test_minimize_preference_atomic_operations() {
        use std::sync::atomic::Ordering;
        let pref = MinimizePreference::default();
        pref.0.store(false, Ordering::SeqCst);
        assert_eq!(pref.0.load(Ordering::SeqCst), false);

        pref.0.store(true, Ordering::SeqCst);
        assert_eq!(pref.0.load(Ordering::SeqCst), true);
    }

    #[test]
    fn test_cursor_info_serialization() {
        use crate::state::CursorInfo;
        let info = CursorInfo {
            id: 32512,
            name: "Normal".to_string(),
            display_name: "Normal select".to_string(),
            image_path: Some("C:\\Windows\\Cursors\\arrow.cur".to_string()),
        };

        let json = serde_json::to_string(&info).expect("serialize");
        let parsed: CursorInfo = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(parsed.id, info.id);
        assert_eq!(parsed.name, info.name);
        assert_eq!(parsed.display_name, info.display_name);
        assert_eq!(parsed.image_path, info.image_path);
    }

    #[test]
    fn test_config_handles_partial_fields() {
        use crate::state::PersistedConfig;
        let partial = r#"{ "shortcut": "Ctrl+B" }"#;
        let parsed: PersistedConfig = serde_json::from_str(partial).expect("parse");

        assert_eq!(parsed.shortcut, Some("Ctrl+B".to_string()));
        assert_eq!(parsed.minimize_to_tray, None);
    }

    #[test]
    fn test_normalize_config_migration() {
        use crate::state::config::*;
        use crate::state::PersistedConfig;
        let old_config = PersistedConfig {
            shortcut: Some("Ctrl+Shift+F9".to_string()),
            shortcut_enabled: None,
            minimize_to_tray: None,
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };

        let normalized = normalize_persisted_config(old_config);
        assert_eq!(normalized.minimize_to_tray, Some(true));
        assert_eq!(normalized.cursor_size, Some(32));
    }

    #[test]
    fn test_write_config_to_invalid_path() {
        use crate::state::config::*;
        use crate::state::PersistedConfig;
        #[cfg(windows)]
        let invalid_path =
            std::path::PathBuf::from("Z:\\nonexistent\\path\\that\\does\\not\\exist");

        #[cfg(not(windows))]
        let invalid_path = std::path::PathBuf::from("/nonexistent/path/that/does/not/exist");

        let config = PersistedConfig::default();
        let result = write_config(&invalid_path, &config);

        assert!(result.is_err());
    }

    #[test]
    fn test_config_roundtrip_empty() {
        use crate::state::config::*;
        use crate::state::PersistedConfig;
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();

        let config = PersistedConfig::default();
        write_config(&dir, &config).expect("write");

        let contents = fs::read_to_string(dir.join("config.json")).expect("read");
        let parsed: PersistedConfig = serde_json::from_str(&contents).expect("parse");

        assert_eq!(parsed.shortcut, None);
        assert_eq!(parsed.minimize_to_tray, None);
    }

    #[test]
    fn test_multiple_config_updates() {
        use crate::state::config::*;
        use crate::state::PersistedConfig;
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();

        for i in 1..=5 {
            let config = PersistedConfig {
                shortcut: Some(format!("Ctrl+{}", i)),
                shortcut_enabled: None,
                minimize_to_tray: Some(i % 2 == 0),
                run_on_startup: None,
                cursor_size: None,
                accent_color: None,
                theme_mode: None,
                default_cursor_style: None,
            };

            write_config(&dir, &config).expect("write");
        }

        let contents = std::fs::read_to_string(dir.join("config.json")).expect("read");
        let final_config: PersistedConfig = serde_json::from_str(&contents).expect("parse");

        assert_eq!(final_config.shortcut, Some("Ctrl+5".to_string()));
        assert_eq!(final_config.minimize_to_tray, Some(false));
    }
}
