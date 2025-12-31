#[cfg(test)]
mod tests {
    use crate::commands::customization::pack_export::export_active_cursor_pack;
    use crate::state::AppState;
    use tauri::{Manager, State, test::MockRuntime};
    use std::fs;
    use std::path::PathBuf;

    fn prepare_app_state() -> (
        impl tauri::Manager<MockRuntime>,
        tauri::AppHandle<MockRuntime>,
    ) {
        let app = tauri::test::mock_app();
        let handle = app.handle().clone();
        handle.manage(AppState::default());
        (app, handle)
    }

    #[tokio::test]
    async fn test_cursor_pack_creation_structure() {
        let (_app, handle) = prepare_app_state();
        let state: State<AppState> = handle.state();
        
        // Setup: Ensure we have some cursor paths in state
        let temp_dir_source = tempfile::tempdir().expect("source temp dir");
        let normal_cur = temp_dir_source.path().join("Normal.cur");
        fs::write(&normal_cur, "fake cursor content").expect("write normal cur");
        
        let hand_cur = temp_dir_source.path().join("Hand.cur");
        fs::write(&hand_cur, "fake cursor content").expect("write hand cur");

        {
            let mut cursor = state.cursor.write().unwrap();
            cursor.cursor_paths.insert("Normal".to_string(), normal_cur.to_string_lossy().to_string());
            cursor.cursor_paths.insert("Hand".to_string(), hand_cur.to_string_lossy().to_string());
        }

        // Mock the cursor packs directory by setting up the environment or inferring where it goes.
        // However, since `export_active_cursor_pack` calls `crate::paths::cursor_packs_dir()`,
        // which might rely on standard folders, we need to be careful.
        // If `crate::paths` uses `app_handle.path()`, MockApp should route it to a temp location.
        
        // Action: Export the pack
        let pack_name = Some("TestPack".to_string());
        let result = export_active_cursor_pack(handle.clone(), state.clone(), pack_name).await;
        
        // Assert
        if let Err(e) = &result {
            println!("Export failed: {}", e);
        }
        assert!(result.is_ok(), "Export failed");
        
        let zip_path_str = result.unwrap().expect("No path returned");
        let zip_path = PathBuf::from(zip_path_str);

        println!("Zip Path: {:?}", zip_path);

        // Verification 1: Folder creation
        // The zip should be inside .../cursor-packs/TestPack/TestPack.zip
        assert!(zip_path.exists(), "Zip file does not exist");
        let parent_dir = zip_path.parent().expect("No parent dir");
        
        assert!(parent_dir.exists(), "Parent dir does not exist");
        assert!(parent_dir.is_dir(), "Parent is not a directory");
        
        // Check if the parent folder name matches the pack name (or close to it)
        // Note: The system might handle name collisions (TestPack (1)), so we check contains
        let parent_name = parent_dir.file_name().unwrap().to_string_lossy();
        assert!(parent_name.contains("TestPack"), "Parent folder name mismatch: {}", parent_name);

        // Verification 2: Zip existence and name
        assert!(zip_path.extension().unwrap().eq_ignore_ascii_case("zip"));

        // Verification 3: Extraction
        // There should be extracted files in the `cursors` subfolder
        let cursors_dir = parent_dir.join("cursors");
        assert!(cursors_dir.exists(), "Cursors subfolder does not exist");
        assert!(cursors_dir.is_dir(), "Cursors subfolder is not a directory");

        let extracted_normal = cursors_dir.join("Normal.cur");
        assert!(extracted_normal.exists(), "Normal.cur not extracted to pack/cursors folder");
        
        let extracted_hand = cursors_dir.join("Hand.cur");
        assert!(extracted_hand.exists(), "Hand.cur not extracted to pack/cursors folder");
    }
}
