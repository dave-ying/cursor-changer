/// Extracted test module from config.rs
/// Tests configuration persistence, normalization, and data structures
#[cfg(test)]
mod tests {
    use crate::state::app_state::DEFAULT_SHORTCUT;
    use crate::state::{config::{normalize_persisted_config, write_config}, PersistedConfig, ThemeMode};
    use serde_json;
    use std::fs;

    #[test]
    fn normalize_sets_default_minimize() {
        let cfg = PersistedConfig {
            shortcut: None,
            shortcut_enabled: Some(true),
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
        assert_eq!(normalized.shortcut, Some(DEFAULT_SHORTCUT.to_string()));
    }

    #[test]
    fn persisted_config_roundtrip() {
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
    fn write_config_creates_file() {
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

    #[test]
    fn test_persisted_config_default() {
        let config = PersistedConfig::default();
        assert_eq!(config.shortcut, None);
        assert_eq!(config.minimize_to_tray, None);
    }

    #[test]
    fn test_write_config_overwrites_existing() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();
        
        let config1 = PersistedConfig {
            shortcut: Some("Ctrl+Old".to_string()),
            shortcut_enabled: Some(true),
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
            shortcut_enabled: Some(true),
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
    fn test_config_handles_partial_fields() {
        let partial = r#"{ "shortcut": "Ctrl+B" }"#;
        let parsed: PersistedConfig = serde_json::from_str(partial).expect("parse");
        
        assert_eq!(parsed.shortcut, Some("Ctrl+B".to_string()));
        assert_eq!(parsed.minimize_to_tray, None);
    }

    #[test]
    fn test_normalize_config_migration() {
        let old_config = PersistedConfig {
            shortcut: Some("Ctrl+Shift+F9".to_string()),
            shortcut_enabled: Some(true),
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
        #[cfg(windows)]
        let invalid_path = std::path::PathBuf::from("Z:\\nonexistent\\path\\that\\does\\not\\exist");
        
        #[cfg(not(windows))]
        let invalid_path = std::path::PathBuf::from("/nonexistent/path/that/does/not/exist");
        
        let config = PersistedConfig::default();
        let result = write_config(&invalid_path, &config);
        
        assert!(result.is_err());
    }

    #[test]
    fn test_config_roundtrip_empty() {
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
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();
        
        for i in 1..=5 {
            let config = PersistedConfig {
                shortcut: Some(format!("Ctrl+{}", i)),
                shortcut_enabled: Some(true),
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

    #[test]
    fn test_cursor_size_defaults_to_32_in_normalize() {
        let config = PersistedConfig {
            shortcut: None,
            shortcut_enabled: Some(true),
            minimize_to_tray: None,
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };
        
        let normalized = normalize_persisted_config(config);
        assert_eq!(normalized.cursor_size, Some(32), "Normalized cursor size should default to 32px");
    }

    #[test]
    fn test_cursor_size_preserves_custom_value() {
        let config = PersistedConfig {
            shortcut: None,
            shortcut_enabled: Some(true),
            minimize_to_tray: None,
            run_on_startup: None,
            cursor_size: Some(128),
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
        };
        
        let normalized = normalize_persisted_config(config);
        assert_eq!(normalized.cursor_size, Some(128), "Normalized config should preserve custom cursor size");
    }

    #[test]
    fn test_persist_preferences_includes_cursor_size() {
        use crate::state::AppState;
        
        let tmp = tempfile::tempdir().expect("tempdir");
        
        // Create a mock app (this won't work without tauri test feature, so we test write_config directly)
        let state = AppState::default();
        state.prefs.write().unwrap().cursor_size = 96;
        let prefs = state.prefs.read().unwrap();
        
        let config = PersistedConfig {
            shortcut: prefs.shortcut.clone(),
            shortcut_enabled: Some(true),
            minimize_to_tray: Some(prefs.minimize_to_tray),
            run_on_startup: Some(prefs.run_on_startup),
            cursor_size: Some(prefs.cursor_size),
            accent_color: Some(prefs.accent_color.clone()),
            theme_mode: Some(prefs.theme_mode),
            default_cursor_style: Some(prefs.default_cursor_style),
        };
        
        write_config(&tmp.path().to_path_buf(), &config).expect("write");
        
        let contents = fs::read_to_string(tmp.path().join("config.json")).expect("read");
        let loaded: PersistedConfig = serde_json::from_str(&contents).expect("parse");
        
        assert_eq!(loaded.cursor_size, Some(96), "Persisted config should contain custom cursor size");
    }

    #[test]
    fn test_cursor_size_persistence_roundtrip() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();
        
        // Simulate user changing cursor size from 32 to 128
        let initial_config = PersistedConfig {
            shortcut: None,
            shortcut_enabled: Some(true),
            minimize_to_tray: Some(true),
            run_on_startup: Some(false),
            cursor_size: Some(32),
            accent_color: Some("#7c3aed".to_string()),
            theme_mode: Some(ThemeMode::System),
            default_cursor_style: None,
        };
        
        write_config(&dir, &initial_config).expect("initial write");
        
        // User changes to 128
        let updated_config = PersistedConfig {
            shortcut: None,
            shortcut_enabled: Some(true),
            minimize_to_tray: Some(true),
            run_on_startup: Some(false),
            cursor_size: Some(128),
            accent_color: Some("#7c3aed".to_string()),
            theme_mode: Some(ThemeMode::System),
            default_cursor_style: None,
        };
        
        write_config(&dir, &updated_config).expect("updated write");
        
        // Load config (simulating app restart)
        let contents = fs::read_to_string(dir.join("config.json")).expect("read");
        let loaded: PersistedConfig = serde_json::from_str(&contents).expect("parse");
        
        assert_eq!(loaded.cursor_size, Some(128), "After restart, cursor size should be 128px");
    }

    #[test]
    fn test_cursor_size_saved_immediately_on_change() {
        let tmp = tempfile::tempdir().expect("tempdir");
        let dir = tmp.path().to_path_buf();
        
        // Initial save with 32px
        let config1 = PersistedConfig {
            cursor_size: Some(32),
            theme_mode: Some(ThemeMode::System),
            ..Default::default()
        };
        write_config(&dir, &config1).expect("write 1");
        
        // Change to 64px (immediate save)
        let config2 = PersistedConfig {
            cursor_size: Some(64),
            theme_mode: Some(ThemeMode::Light),
            ..Default::default()
        };
        write_config(&dir, &config2).expect("write 2");
        
        // Change to 128px (immediate save)
        let config3 = PersistedConfig {
            cursor_size: Some(128),
            theme_mode: Some(ThemeMode::Dark),
            ..Default::default()
        };
        write_config(&dir, &config3).expect("write 3");
        
        // Verify final state is 128px
        let contents = fs::read_to_string(dir.join("config.json")).expect("read");
        let loaded: PersistedConfig = serde_json::from_str(&contents).expect("parse");
        
        assert_eq!(loaded.cursor_size, Some(128), "Cursor size should be saved immediately on each change");
    }
}

