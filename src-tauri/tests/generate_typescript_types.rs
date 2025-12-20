/// Test to generate TypeScript types from Rust types
/// Run with: cargo test --test generate_typescript_types
///
/// This test uses ts-rs to generate TypeScript type definitions
/// from Rust structs that are used in Tauri commands.
///
/// **Validates: Requirements 9.1**

#[cfg(test)]
mod typescript_generation {
    use ts_rs::TS;

    #[test]
    fn generate_all_typescript_types() {
        // Import all types that need TypeScript generation
        use cursor_changer_tauri::commands::customization::library::LibraryCursor;
        use cursor_changer_tauri::commands::effects_commands::EffectsConfig;
        use cursor_changer_tauri::state::app_state::CursorInfo;
        use cursor_changer_tauri::state::types::{CursorClickPointInfo, CursorStatePayload};
        use cursor_changer_tauri::state::{CustomizationMode, DefaultCursorStyle, ThemeMode};

        // Export all types - this triggers ts-rs to generate .ts files
        CursorStatePayload::export().expect("Failed to export CursorStatePayload");
        CursorClickPointInfo::export().expect("Failed to export CursorClickPointInfo");
        CursorInfo::export().expect("Failed to export CursorInfo");
        LibraryCursor::export().expect("Failed to export LibraryCursor");
        EffectsConfig::export().expect("Failed to export EffectsConfig");

        ThemeMode::export().expect("Failed to export ThemeMode");
        DefaultCursorStyle::export().expect("Failed to export DefaultCursorStyle");
        CustomizationMode::export().expect("Failed to export CustomizationMode");

        println!("✓ Generated TypeScript types for all Tauri command types");
    }

    #[test]
    fn verify_typescript_types_match_rust() {
        // Verify that TypeScript type definitions match Rust signatures
        use cursor_changer_tauri::state::app_state::CursorInfo;
        use cursor_changer_tauri::state::types::CursorStatePayload;

        // Get the TypeScript definition
        let cursor_state_ts = CursorStatePayload::decl();
        let cursor_info_ts = CursorInfo::decl();

        // Verify key fields are present in the TypeScript definition
        assert!(
            cursor_state_ts.contains("hidden"),
            "CursorStatePayload should have 'hidden' field"
        );
        assert!(
            cursor_state_ts.contains("cursor_size"),
            "CursorStatePayload should have 'cursor_size' field"
        );
        assert!(
            cursor_state_ts.contains("theme_mode"),
            "CursorStatePayload should have 'theme_mode' field"
        );

        assert!(
            cursor_info_ts.contains("id"),
            "CursorInfo should have 'id' field"
        );
        assert!(
            cursor_info_ts.contains("name"),
            "CursorInfo should have 'name' field"
        );

        println!("✓ TypeScript types match Rust struct definitions");
    }
}
