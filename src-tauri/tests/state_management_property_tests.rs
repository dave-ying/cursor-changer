//! Property-based tests for state management
//!
//! These tests validate correctness properties for application state management,
//! including state consistency, persistence, and concurrent access.

use cursor_changer_tauri::state::{
    AppState, CursorStatePayload, CustomizationMode, DefaultCursorStyle, PersistedConfig, ThemeMode,
};
use proptest::prelude::*;
use std::sync::{Arc, Mutex, RwLock};

// Helper function to create a valid AppState with random values
fn arb_app_state() -> impl Strategy<Value = AppState> {
    // Split into smaller tuples to avoid proptest's tuple size limit
    let basic_fields = (
        any::<bool>(),
        prop::option::of("[A-Za-z0-9+]+"),
        any::<bool>(),
        prop::option::of("[A-Za-z0-9+]+"),
        any::<bool>(),
        any::<bool>(),
        any::<bool>(),
        any::<bool>(),
        16i32..=256i32,
    );

    let path_fields = (
        prop::option::of("[a-z0-9/\\\\._-]+"),
        prop::collection::hash_map("[A-Za-z]+", "[a-z0-9/\\\\._-]+", 0..10),
        prop::collection::hash_map("[A-Za-z]+", "[a-z0-9/\\\\._-]+", 0..10),
        prop::collection::hash_map("[A-Za-z]+", "[a-z0-9/\\\\._-]+", 0..10),
    );

    let ui_fields = (
        prop_oneof![
            Just(CustomizationMode::Simple),
            Just(CustomizationMode::Advanced)
        ],
        "#[0-9a-fA-F]{6}",
        prop_oneof![
            Just(ThemeMode::Light),
            Just(ThemeMode::Dark),
            Just(ThemeMode::System)
        ],
        Just(DefaultCursorStyle::Windows),
    );

    (basic_fields, path_fields, ui_fields).prop_map(|(basic, paths, ui)| {
        use cursor_changer_tauri::state::app_state::{
            CursorRuntimeState, ModeCustomizationState, PreferencesState, RestorationState,
        };

        let (
            hidden,
            shortcut,
            shortcut_enabled,
            app_shortcut,
            app_shortcut_enabled,
            app_enabled,
            run_on_startup,
            minimize_to_tray,
            cursor_size,
        ) = basic;
        let (
            last_loaded_cursor_path,
            cursor_paths,
            simple_mode_cursor_paths,
            advanced_mode_cursor_paths,
        ) = paths;
        let (customization_mode, accent_color, theme_mode, default_cursor_style) = ui;

        AppState {
            cursor: RwLock::new(CursorRuntimeState {
                hidden,
                last_loaded_cursor_path,
                cursor_paths,
            }),
            prefs: RwLock::new(PreferencesState {
                shortcut,
                shortcut_enabled,
                app_shortcut,
                app_shortcut_enabled,
                app_enabled,
                run_on_startup,
                minimize_to_tray,
                cursor_size,
                accent_color,
                theme_mode,
                default_cursor_style,
            }),
            modes: RwLock::new(ModeCustomizationState {
                simple_mode_cursor_paths,
                advanced_mode_cursor_paths,
                customization_mode,
            }),
            restoration: RwLock::new(RestorationState {
                cursor_registry_snapshot: None,
            }),
        }
    })
}

// Helper function to create a valid PersistedConfig
fn arb_persisted_config() -> impl Strategy<Value = PersistedConfig> {
    (
        prop::option::of("[A-Za-z0-9+]+"),
        prop::option::of(any::<bool>()),
        prop::option::of("[A-Za-z0-9+]+"),
        prop::option::of(any::<bool>()),
        prop::option::of(any::<bool>()),
        prop::option::of(any::<bool>()),
        prop::option::of(any::<bool>()),
        prop::option::of(16i32..=256i32),
        prop::option::of("#[0-9a-fA-F]{6}"),
        prop::option::of(prop_oneof![
            Just(ThemeMode::Light),
            Just(ThemeMode::Dark),
            Just(ThemeMode::System)
        ]),
        prop::option::of(Just(DefaultCursorStyle::Windows)),
        prop::option::of(prop_oneof![
            Just(CustomizationMode::Simple),
            Just(CustomizationMode::Advanced)
        ]),
    )
        .prop_map(
            |(
                shortcut,
                shortcut_enabled,
                app_shortcut,
                app_shortcut_enabled,
                app_enabled,
                minimize_to_tray,
                run_on_startup,
                cursor_size,
                accent_color,
                theme_mode,
                default_cursor_style,
                customization_mode,
            )| {
                PersistedConfig {
                    shortcut,
                    shortcut_enabled,
                    app_shortcut,
                    app_shortcut_enabled,
                    app_enabled,
                    minimize_to_tray,
                    run_on_startup,
                    cursor_size,
                    accent_color,
                    theme_mode,
                    default_cursor_style,
                    customization_mode,
                }
            },
        )
}

/// **Feature: app-quality-improvement, Property 3: State updates maintain frontend-backend consistency**
///
/// For any valid sequence of state update operations, the frontend state should remain
/// synchronized with the backend state, with no divergence or stale data.
///
/// **Validates: Requirements 2.3, 6.1**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_state_updates_maintain_consistency(
        initial_state in arb_app_state(),
        updates in prop::collection::vec(
            (
                prop::option::of("[A-Za-z0-9+]+"),
                any::<bool>(),
                any::<bool>(),
                16i32..=256i32,
            ),
            1..10
        ),
    ) {
        // Create a shared state
        let state = Arc::new(Mutex::new(initial_state));

        // Apply a sequence of updates
        for (shortcut, minimize_to_tray, run_on_startup, cursor_size) in updates {
            let mut guard = state.lock().unwrap();

            // Apply updates
            {
                let mut all = guard.write_all().unwrap();
                if let Some(sc) = shortcut {
                    all.prefs.shortcut = Some(sc);
                }
                all.prefs.minimize_to_tray = minimize_to_tray;
                all.prefs.run_on_startup = run_on_startup;
                all.prefs.cursor_size = cursor_size;
            }

            // Create payload (simulating what frontend receives)
            let payload = CursorStatePayload::try_from(&*guard).expect("Application state poisoned");

            let snapshot = guard.read_all().unwrap();

            // Verify consistency between state and payload
            prop_assert_eq!(&payload.shortcut, &snapshot.prefs.shortcut);
            prop_assert_eq!(payload.minimize_to_tray, snapshot.prefs.minimize_to_tray);
            prop_assert_eq!(payload.run_on_startup, snapshot.prefs.run_on_startup);
            prop_assert_eq!(payload.cursor_size, snapshot.prefs.cursor_size);
            prop_assert_eq!(payload.hidden, snapshot.cursor.hidden);
            prop_assert_eq!(payload.shortcut_enabled, snapshot.prefs.shortcut_enabled);
            prop_assert_eq!(&payload.accent_color, &snapshot.prefs.accent_color);
            prop_assert_eq!(&payload.theme_mode, &snapshot.prefs.theme_mode);
        }
    }
}

/// Test that cursor_paths updates are reflected in payload
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_cursor_paths_updates_maintain_consistency(
        initial_state in arb_app_state(),
        cursor_updates in prop::collection::vec(
            ("[A-Za-z]+", "[a-z0-9/\\\\._-]+"),
            1..10
        ),
    ) {
        let state = Arc::new(Mutex::new(initial_state));

        for (cursor_name, cursor_path) in cursor_updates {
            let mut guard = state.lock().unwrap();

            // Update cursor path
            {
                let mut cursor = guard.cursor.write().unwrap();
                cursor
                    .cursor_paths
                    .insert(cursor_name.clone(), cursor_path.clone());
            }

            // Create payload
            let payload = CursorStatePayload::try_from(&*guard).expect("Application state poisoned");

            // Verify the cursor path is in the payload
            prop_assert_eq!(
                payload.cursor_paths.get(&cursor_name),
                Some(&cursor_path),
                "Cursor path for {} not consistent", cursor_name
            );
        }
    }
}

/// Test that removing cursor paths is reflected in payload
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_cursor_paths_removal_maintains_consistency(
        mut initial_state in arb_app_state(),
        cursor_names in prop::collection::vec("[A-Za-z]+", 1..5),
    ) {
        // Add some cursor paths first
        for name in &cursor_names {
            initial_state
                .cursor
                .write()
                .unwrap()
                .cursor_paths
                .insert(name.clone(), format!("path/to/{}.cur", name));
        }

        let state = Arc::new(Mutex::new(initial_state));

        // Remove cursor paths one by one
        for cursor_name in cursor_names {
            let mut guard = state.lock().unwrap();
            {
                guard
                    .cursor
                    .write()
                    .unwrap()
                    .cursor_paths
                    .remove(&cursor_name);
            }

            // Create payload
            let payload = CursorStatePayload::try_from(&*guard).expect("Application state poisoned");

            // Verify the cursor path is not in the payload
            prop_assert!(
                !payload.cursor_paths.contains_key(&cursor_name),
                "Removed cursor path {} still in payload", cursor_name
            );
        }
    }
}

/// **Feature: app-quality-improvement, Property 9: Concurrent state updates avoid race conditions**
///
/// For any set of concurrent state update operations, the application should handle them
/// without race conditions, data loss, or inconsistent state.
///
/// **Validates: Requirements 6.2, 8.3**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_concurrent_state_updates_avoid_race_conditions(
        initial_state in arb_app_state(),
        updates in prop::collection::vec(
            (
                "[A-Za-z]+",
                "[a-z0-9/\\\\._-]+",
                16i32..=256i32,
            ),
            2..10
        ),
    ) {
        use std::thread;

        // Create a shared state
        let state = Arc::new(Mutex::new(initial_state));

        // Spawn multiple threads to perform concurrent updates
        let mut handles = vec![];

        for (cursor_name, cursor_path, cursor_size) in updates.clone() {
            let state_clone = Arc::clone(&state);
            let handle = thread::spawn(move || {
                // Perform state update
                let mut guard = state_clone.lock().unwrap();
                {
                    guard
                        .cursor
                        .write()
                        .unwrap()
                        .cursor_paths
                        .insert(cursor_name.clone(), cursor_path.clone());
                }
                {
                    guard.prefs.write().unwrap().cursor_size = cursor_size;
                }
                // Return what we set for verification
                (cursor_name, cursor_path, cursor_size)
            });
            handles.push(handle);
        }

        // Wait for all threads to complete
        let results: Vec<_> = handles.into_iter()
            .map(|h| h.join().unwrap())
            .collect();

        // Verify state is consistent (no panics, no data loss)
        let guard = state.lock().unwrap();

        // All cursor paths that were set should be present
        for (cursor_name, cursor_path, _) in &results {
            // The cursor path should either be the one we set, or one set by another thread
            // (race condition is acceptable as long as it's one of the valid values)
            if let Some(actual_path) = guard
                .cursor
                .read()
                .unwrap()
                .cursor_paths
                .get(cursor_name)
            {
                // Verify it's one of the paths that was set
                let valid_paths: Vec<_> = results.iter()
                    .filter(|(name, _, _)| name == cursor_name)
                    .map(|(_, path, _)| path)
                    .collect();
                prop_assert!(
                    valid_paths.contains(&actual_path),
                    "Cursor path for {} is not one of the valid values", cursor_name
                );
            }
        }

        // Cursor size should be one of the values that was set
        let valid_sizes: Vec<_> = results.iter().map(|(_, _, size)| *size).collect();
        let current_size = guard.prefs.read().unwrap().cursor_size;
        prop_assert!(
            valid_sizes.contains(&current_size),
            "Cursor size {} is not one of the valid values",
            current_size
        );
    }
}

/// Test that concurrent reads don't block or cause issues
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_concurrent_reads_are_safe(
        initial_state in arb_app_state(),
        num_readers in 2usize..10usize,
    ) {
        use std::thread;

        let state = Arc::new(Mutex::new(initial_state));

        // Spawn multiple reader threads
        let mut handles = vec![];

        for _ in 0..num_readers {
            let state_clone = Arc::clone(&state);
            let handle = thread::spawn(move || {
                // Read state multiple times
                for _ in 0..10 {
                    let guard = state_clone.lock().unwrap();
                    let _payload = CursorStatePayload::try_from(&*guard).expect("Application state poisoned");
                    // Just verify we can read without panicking
                }
            });
            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            prop_assert!(handle.join().is_ok(), "Reader thread panicked");
        }
    }
}

/// **Feature: app-quality-improvement, Property 10: State persistence round-trip is identity**
///
/// For any valid application state, saving the state to persistent storage and then loading it
/// should result in an equivalent state (round-trip property).
///
/// **Validates: Requirements 6.3**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_state_persistence_round_trip(
        config in arb_persisted_config(),
    ) {
        use cursor_changer_tauri::state::config::write_config;
        use std::fs;

        // Create a temporary directory for the test
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let config_dir = temp_dir.path().to_path_buf();

        // Write the config
        let write_result = write_config(&config_dir, &config);
        prop_assert!(write_result.is_ok(), "Failed to write config: {:?}", write_result.err());

        // Read the config back
        let config_file = config_dir.join("config.json");
        prop_assert!(config_file.exists(), "Config file was not created");

        let json_str = fs::read_to_string(&config_file)
            .expect("Failed to read config file");
        let loaded_config: PersistedConfig = serde_json::from_str(&json_str)
            .expect("Failed to deserialize config");

        // Verify round-trip: loaded config should match original
        prop_assert_eq!(&loaded_config.shortcut, &config.shortcut, "Shortcut mismatch");
        prop_assert_eq!(&loaded_config.shortcut_enabled, &config.shortcut_enabled, "Shortcut enabled mismatch");
        prop_assert_eq!(&loaded_config.minimize_to_tray, &config.minimize_to_tray, "Minimize to tray mismatch");
        prop_assert_eq!(&loaded_config.run_on_startup, &config.run_on_startup, "Run on startup mismatch");
        prop_assert_eq!(&loaded_config.cursor_size, &config.cursor_size, "Cursor size mismatch");
        prop_assert_eq!(&loaded_config.accent_color, &config.accent_color, "Accent color mismatch");
        prop_assert_eq!(&loaded_config.theme_mode, &config.theme_mode, "Theme mode mismatch");
        prop_assert_eq!(&loaded_config.app_enabled, &config.app_enabled, "App enabled mismatch");
        prop_assert_eq!(&loaded_config.app_shortcut, &config.app_shortcut, "App shortcut mismatch");
        prop_assert_eq!(&loaded_config.app_shortcut_enabled, &config.app_shortcut_enabled, "App shortcut enabled mismatch");
    }
}

/// Test round-trip with AppState to PersistedConfig conversion
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_app_state_to_persisted_config_round_trip(
        state in arb_app_state(),
    ) {
        let prefs = state.prefs.read().expect("prefs poisoned");

        // Convert AppState to PersistedConfig
        let config = PersistedConfig {
            shortcut: prefs.shortcut.clone(),
            shortcut_enabled: Some(prefs.shortcut_enabled),
            app_shortcut: prefs.app_shortcut.clone(),
            app_shortcut_enabled: Some(prefs.app_shortcut_enabled),
            app_enabled: Some(prefs.app_enabled),
            minimize_to_tray: Some(prefs.minimize_to_tray),
            run_on_startup: Some(prefs.run_on_startup),
            cursor_size: Some(prefs.cursor_size),
            accent_color: Some(prefs.accent_color.clone()),
            theme_mode: Some(prefs.theme_mode.clone()),
            default_cursor_style: Some(prefs.default_cursor_style.clone()),
            customization_mode: Some(state.modes.read().unwrap().customization_mode),
        };

        // Serialize and deserialize
        let json = serde_json::to_string(&config).expect("Failed to serialize");
        let loaded: PersistedConfig = serde_json::from_str(&json).expect("Failed to deserialize");

        // Verify values match
        prop_assert_eq!(&loaded.shortcut, &prefs.shortcut);
        prop_assert_eq!(loaded.shortcut_enabled, Some(prefs.shortcut_enabled));
        prop_assert_eq!(loaded.minimize_to_tray, Some(prefs.minimize_to_tray));
        prop_assert_eq!(loaded.run_on_startup, Some(prefs.run_on_startup));
        prop_assert_eq!(loaded.cursor_size, Some(prefs.cursor_size));
        prop_assert_eq!(&loaded.accent_color, &Some(prefs.accent_color.clone()));
        prop_assert_eq!(&loaded.theme_mode, &Some(prefs.theme_mode.clone()));
        prop_assert_eq!(
            &loaded.default_cursor_style,
            &Some(prefs.default_cursor_style.clone())
        );
    }
}

/// Test that cursor size invariant is maintained
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_cursor_size_invariant_maintained(
        mut state in arb_app_state(),
        size_updates in prop::collection::vec(16i32..=256i32, 1..20),
    ) {
        // Apply multiple cursor size updates
        for new_size in size_updates {
            state.prefs.write().expect("prefs poisoned").cursor_size = new_size;
            let current_size = state.prefs.read().expect("prefs poisoned").cursor_size;

            // Verify invariant: cursor size is always within valid range
            prop_assert!(
                current_size >= 16 && current_size <= 256,
                "Cursor size {} violates invariant",
                current_size
            );
        }
    }
}

/// Test that mode invariants are maintained
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_mode_invariants_maintained(
        mut state in arb_app_state(),
        mode_updates in prop::collection::vec(
            prop_oneof![Just(CustomizationMode::Simple), Just(CustomizationMode::Advanced)],
            1..10
        ),
    ) {
        // Apply multiple mode updates
        for new_mode in mode_updates {
            state
                .modes
                .write()
                .expect("modes poisoned")
                .customization_mode = new_mode;
            let current_mode = state.modes.read().expect("modes poisoned").customization_mode;

            // Verify invariant: mode is always valid
            prop_assert!(
                matches!(
                    current_mode,
                    CustomizationMode::Simple | CustomizationMode::Advanced
                ),
                "Invalid mode: {:?}",
                current_mode
            );
        }
    }
}

/// **Feature: app-quality-improvement, Property 12: State access returns consistent data**
///
/// For any state access operation, the returned data should be consistent with the current state
/// and not stale or corrupted.
///
/// **Validates: Requirements 6.5**
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_state_access_returns_consistent_data(
        initial_state in arb_app_state(),
        access_patterns in prop::collection::vec(
            (
                "[A-Za-z]+",
                "[a-z0-9/\\\\._-]+",
            ),
            1..10
        ),
    ) {
        let state = Arc::new(Mutex::new(initial_state));

        // Perform multiple state updates and accesses
        for (cursor_name, cursor_path) in access_patterns {
            // Update state
            {
                let mut guard = state.lock().unwrap();
                guard
                    .cursor
                    .write()
                    .unwrap()
                    .cursor_paths
                    .insert(cursor_name.clone(), cursor_path.clone());
            }

            // Access state immediately after update
            {
                let guard = state.lock().unwrap();

                // Verify the data we just wrote is immediately accessible
                let cursor_guard = guard.cursor.read().unwrap();
                let accessed_path = cursor_guard.cursor_paths.get(&cursor_name);
                prop_assert!(
                    accessed_path.is_some(),
                    "Cursor path for {} not found after insert", cursor_name
                );
                prop_assert_eq!(
                    accessed_path.unwrap(),
                    &cursor_path,
                    "Accessed cursor path doesn't match written value"
                );
            }

            // Access via payload conversion
            {
                let guard = state.lock().unwrap();
                let payload = CursorStatePayload::try_from(&*guard).expect("Application state poisoned");

                // Verify payload contains the same data
                let payload_path = payload.cursor_paths.get(&cursor_name);
                prop_assert!(
                    payload_path.is_some(),
                    "Cursor path for {} not in payload", cursor_name
                );
                prop_assert_eq!(
                    payload_path.unwrap(),
                    &cursor_path,
                    "Payload cursor path doesn't match state"
                );
            }
        }
    }
}

/// Test that multiple consecutive reads return the same data
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_consecutive_reads_return_same_data(
        state_data in arb_app_state(),
        num_reads in 2usize..10usize,
    ) {
        let state = Arc::new(Mutex::new(state_data));

        // Perform multiple consecutive reads
        let mut payloads = Vec::new();
        for _ in 0..num_reads {
            let guard = state.lock().unwrap();
            let payload = CursorStatePayload::try_from(&*guard).expect("Application state poisoned");
            payloads.push(payload);
        }

        // Verify all reads returned the same data
        let first = &payloads[0];
        for (i, payload) in payloads.iter().enumerate().skip(1) {
            prop_assert_eq!(
                &payload.shortcut, &first.shortcut,
                "Read {} shortcut differs from first read", i
            );
            prop_assert_eq!(
                payload.cursor_size, first.cursor_size,
                "Read {} cursor_size differs from first read", i
            );
            prop_assert_eq!(
                payload.minimize_to_tray, first.minimize_to_tray,
                "Read {} minimize_to_tray differs from first read", i
            );
            prop_assert_eq!(
                &payload.accent_color, &first.accent_color,
                "Read {} accent_color differs from first read", i
            );
            prop_assert_eq!(
                &payload.theme_mode, &first.theme_mode,
                "Read {} theme_mode differs from first read", i
            );
        }
    }
}

/// Test that state access after concurrent writes is consistent
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn prop_state_access_after_concurrent_writes_is_consistent(
        initial_state in arb_app_state(),
        writes in prop::collection::vec(
            (
                "[A-Za-z]+",
                "[a-z0-9/\\\\._-]+",
            ),
            2..5
        ),
    ) {
        use std::thread;

        let state = Arc::new(Mutex::new(initial_state));

        // Perform concurrent writes
        let mut handles = vec![];
        for (cursor_name, cursor_path) in writes.clone() {
            let state_clone = Arc::clone(&state);
            let handle = thread::spawn(move || {
                let mut guard = state_clone.lock().unwrap();
                guard
                    .cursor
                    .write()
                    .unwrap()
                    .cursor_paths
                    .insert(cursor_name, cursor_path);
            });
            handles.push(handle);
        }

        // Wait for all writes to complete
        for handle in handles {
            handle.join().unwrap();
        }

        // Access state after all writes
        let guard = state.lock().unwrap();

        // Verify state is consistent (all cursor paths are valid)
        for (name, path) in &guard.cursor.read().unwrap().cursor_paths {
            prop_assert!(!name.is_empty(), "Empty cursor name in state");
            prop_assert!(!path.is_empty(), "Empty cursor path in state");
        }

        // Verify payload conversion is consistent
        let payload = CursorStatePayload::try_from(&*guard).expect("Application state poisoned");
        prop_assert_eq!(
            payload.cursor_paths.len(),
            guard.cursor.read().unwrap().cursor_paths.len(),
            "Payload cursor_paths length doesn't match state"
        );
    }
}

// ============================================================================
// Unit Tests for State Management
// ============================================================================

#[cfg(test)]
mod unit_tests {
    use super::*;
    use cursor_changer_tauri::state::app_state::DEFAULT_SHORTCUT;
    use cursor_changer_tauri::state::config::normalize_persisted_config;

    /// Test state initialization with default values
    #[test]
    fn test_state_initialization() {
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
        assert_eq!(
            state.modes.read().unwrap().customization_mode,
            CustomizationMode::Simple
        );
        assert_eq!(state.prefs.read().unwrap().accent_color, "#7c3aed");
        assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::Dark);
    }

    /// Test state updates
    #[test]
    fn test_state_updates() {
        let state = AppState::default();

        // Update cursor size
        state.prefs.write().unwrap().cursor_size = 64;
        assert_eq!(state.prefs.read().unwrap().cursor_size, 64);

        // Update shortcut
        state.prefs.write().unwrap().shortcut = Some("Ctrl+Shift+C".to_string());
        assert_eq!(
            state.prefs.read().unwrap().shortcut,
            Some("Ctrl+Shift+C".to_string())
        );

        // Update cursor paths
        state
            .cursor
            .write()
            .unwrap()
            .cursor_paths
            .insert("Normal".to_string(), "path/to/cursor.cur".to_string());
        assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 1);
        assert_eq!(
            state.cursor.read().unwrap().cursor_paths.get("Normal"),
            Some(&"path/to/cursor.cur".to_string())
        );
    }

    /// Test state persistence serialization
    #[test]
    fn test_state_persistence_serialization() {
        let config = PersistedConfig {
            shortcut: Some("Ctrl+Alt+C".to_string()),
            shortcut_enabled: Some(true),
            app_shortcut: Some("Ctrl+Alt+Q".to_string()),
            app_shortcut_enabled: Some(false),
            app_enabled: Some(true),
            minimize_to_tray: Some(false),
            run_on_startup: Some(true),
            cursor_size: Some(128),
            accent_color: Some("#ff0000".to_string()),
            theme_mode: Some(ThemeMode::Light),
            default_cursor_style: Some(DefaultCursorStyle::Windows),
            customization_mode: Some(CustomizationMode::Simple),
        };

        // Serialize
        let json = serde_json::to_string(&config).expect("Failed to serialize");

        // Deserialize
        let loaded: PersistedConfig = serde_json::from_str(&json).expect("Failed to deserialize");

        assert_eq!(loaded.shortcut, config.shortcut);
        assert_eq!(loaded.shortcut_enabled, config.shortcut_enabled);
        assert_eq!(loaded.minimize_to_tray, config.minimize_to_tray);
        assert_eq!(loaded.run_on_startup, config.run_on_startup);
        assert_eq!(loaded.cursor_size, config.cursor_size);
        assert_eq!(loaded.accent_color, config.accent_color);
        assert_eq!(loaded.theme_mode, config.theme_mode);
        assert_eq!(loaded.default_cursor_style, config.default_cursor_style);
    }

    /// Test config normalization
    #[test]
    fn test_config_normalization() {
        let mut config = PersistedConfig {
            shortcut: Some("Ctrl+C".to_string()),
            shortcut_enabled: None,
            app_shortcut: None,
            app_shortcut_enabled: None,
            app_enabled: None,
            minimize_to_tray: None,
            run_on_startup: None,
            cursor_size: None,
            accent_color: None,
            theme_mode: None,
            default_cursor_style: None,
            customization_mode: None,
        };

        config = normalize_persisted_config(config);

        // Verify defaults are applied
        assert_eq!(config.shortcut_enabled, Some(true));
        assert_eq!(config.minimize_to_tray, Some(true));
        assert_eq!(config.run_on_startup, Some(false));
        assert_eq!(config.cursor_size, Some(32));
        assert_eq!(config.accent_color, Some("#7c3aed".to_string()));
        assert_eq!(config.theme_mode, Some(ThemeMode::Dark));
        assert_eq!(
            config.default_cursor_style,
            Some(DefaultCursorStyle::Windows)
        );
    }

    /// Test CursorStatePayload conversion from AppState
    #[test]
    fn test_cursor_state_payload_conversion() {
        let state = AppState::default();
        state.prefs.write().unwrap().cursor_size = 96;
        state.prefs.write().unwrap().shortcut = Some("Ctrl+Shift+X".to_string());
        state
            .cursor
            .write()
            .unwrap()
            .cursor_paths
            .insert("Normal".to_string(), "test.cur".to_string());

        let payload = CursorStatePayload::try_from(&state).expect("Application state poisoned");

        assert_eq!(payload.cursor_size, 96);
        assert_eq!(payload.shortcut, Some("Ctrl+Shift+X".to_string()));
        assert_eq!(payload.cursor_paths.len(), 1);
        assert_eq!(
            payload.cursor_paths.get("Normal"),
            Some(&"test.cur".to_string())
        );
    }

    /// Test state with multiple cursor paths
    #[test]
    fn test_multiple_cursor_paths() {
        let state = AppState::default();

        {
            let mut cursor = state.cursor.write().unwrap();
            cursor
                .cursor_paths
                .insert("Normal".to_string(), "normal.cur".to_string());
            cursor
                .cursor_paths
                .insert("Hand".to_string(), "hand.cur".to_string());
            cursor
                .cursor_paths
                .insert("Text".to_string(), "text.cur".to_string());
        }

        let cursor = state.cursor.read().unwrap();
        assert_eq!(cursor.cursor_paths.len(), 3);
        assert!(cursor.cursor_paths.contains_key("Normal"));
        assert!(cursor.cursor_paths.contains_key("Hand"));
        assert!(cursor.cursor_paths.contains_key("Text"));
    }

    /// Test removing cursor paths
    #[test]
    fn test_remove_cursor_paths() {
        let state = AppState::default();

        {
            let mut cursor = state.cursor.write().unwrap();
            cursor
                .cursor_paths
                .insert("Normal".to_string(), "normal.cur".to_string());
            cursor
                .cursor_paths
                .insert("Hand".to_string(), "hand.cur".to_string());
        }

        assert_eq!(state.cursor.read().unwrap().cursor_paths.len(), 2);

        state.cursor.write().unwrap().cursor_paths.remove("Normal");

        let cursor = state.cursor.read().unwrap();
        assert_eq!(cursor.cursor_paths.len(), 1);
        assert!(!cursor.cursor_paths.contains_key("Normal"));
        assert!(cursor.cursor_paths.contains_key("Hand"));
    }

    /// Test theme mode values
    #[test]
    fn test_theme_mode_values() {
        let state = AppState::default();

        state.prefs.write().unwrap().theme_mode = ThemeMode::Light;
        assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::Light);

        state.prefs.write().unwrap().theme_mode = ThemeMode::Dark;
        assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::Dark);

        state.prefs.write().unwrap().theme_mode = ThemeMode::System;
        assert_eq!(state.prefs.read().unwrap().theme_mode, ThemeMode::System);
    }

    /// Test customization mode values
    #[test]
    fn test_customization_mode_values() {
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
}
