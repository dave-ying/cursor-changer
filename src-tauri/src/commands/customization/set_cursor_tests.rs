#[cfg(test)]
mod tests {
    use super::*;
    use cursor_changer_tauri::commands::customization::{
        set_cursor_image, set_all_cursors, set_all_cursors_with_size,
        set_single_cursor_with_size, set_cursor_size,
    };
    use cursor_changer_tauri::state::AppState;
    use cursor_changer_tauri::system::{
        set_apply_cursor_file_with_size_mock_guard, set_apply_cursor_from_file_with_size_mock_guard,
    };
    use std::sync::Arc;
    use std::sync::Mutex;
    use tauri::{Manager, State, test::MockRuntime};

    fn prepare_app_state() -> (
        tauri::test::MockApp<MockRuntime>,
        tauri::AppHandle<MockRuntime>,
        State<'static, AppState>,
    ) {
        let app = tauri::test::mock_app();
        let handle = app.handle().clone();
        handle.manage(AppState::default());
        let state = handle.state::<AppState>();
        (app, handle, state)
    }

    #[test]
    fn set_cursor_image_rejects_missing_file() {
        let (_app, handle, state) = prepare_app_state();
        let result = set_cursor_image("Normal".into(), "C:/missing.cur".into(), state, handle);
        assert!(result.is_err());
    }

    #[test]
    fn set_cursor_image_converts_supported_image() {
        let temp = tempfile::tempdir().expect("tempdir");
        let png_path = temp.path().join("sample.png");

        let image = image::ImageBuffer::from_pixel(4, 4, image::Rgba([0, 255, 0, 255]));
        image
            .save_with_format(&png_path, image::ImageFormat::Png)
            .expect("save png");

        let (_app, handle, state) = prepare_app_state();

        let info = set_cursor_image(
            "Normal".into(),
            png_path.to_string_lossy().to_string(),
            state,
            handle,
        )
        .expect("set cursor image");

        let image_path = info.image_path.expect("converted path");
        assert!(image_path.ends_with("_converted.cur"));
        assert!(std::path::Path::new(&image_path).exists());
    }

    #[test]
    fn set_all_cursors_with_size_invokes_system_apply() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();

        let calls: Arc<Mutex<Vec<(String, i32)>>> = Arc::new(Mutex::new(Vec::new()));
        let calls_clone = Arc::clone(&calls);
        let _apply_all_guard = set_apply_cursor_file_with_size_mock_guard(move |path, size| {
            calls_clone.lock().unwrap().push((path.to_string(), size));
            true
        });

        let result = set_all_cursors_with_size(
            cur_path.to_string_lossy().to_string(),
            64,
            state,
            handle,
        )
        .expect("set all cursors");

        assert_eq!(result.len(), crate::cursor_changer::CURSOR_TYPES.len());
        let calls = calls.lock().unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].1, 64);
    }

    #[test]
    fn set_single_cursor_with_size_invokes_system_apply() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();

        let calls: Arc<Mutex<Vec<(u32, i32)>>> = Arc::new(Mutex::new(Vec::new()));
        let calls_clone = Arc::clone(&calls);
        let _apply_single_guard =
            set_apply_cursor_from_file_with_size_mock_guard(move |_path, id, size| {
            calls_clone.lock().unwrap().push((id, size));
            true
        });

        let info = set_single_cursor_with_size(
            "Normal".into(),
            cur_path.to_string_lossy().to_string(),
            96,
            state,
            handle,
        )
        .expect("set single cursor");

        assert_eq!(info.name, "Normal");
        let calls = calls.lock().unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].1, 96);
    }

    #[test]
    fn set_cursor_size_updates_all_loaded_paths() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();

        {
            let mut cursor = state.cursor.write().unwrap();
            cursor
                .cursor_paths
                .insert("Normal".into(), cur_path.to_string_lossy().to_string());
        }

        let calls: Arc<Mutex<Vec<(String, u32, i32)>>> = Arc::new(Mutex::new(Vec::new()));
        let calls_clone = Arc::clone(&calls);
        let _apply_resize_guard =
            set_apply_cursor_from_file_with_size_mock_guard(move |path, id, size| {
            calls_clone.lock().unwrap().push((path.to_string(), id, size));
            true
        });

        let payload = set_cursor_size(72, state, handle).expect("resize");
        assert_eq!(payload.cursor_size, 72);

        let calls = calls.lock().unwrap();
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].2, 72);
    }

    #[test]
    fn set_cursor_image_rejects_invalid_cursor_name() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();
        let result = set_cursor_image(
            "InvalidCursor".into(),
            cur_path.to_string_lossy().to_string(),
            state,
            handle,
        );
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }

    #[test]
    fn set_cursor_image_accepts_cur_file() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();
        let info = set_cursor_image(
            "Normal".into(),
            cur_path.to_string_lossy().to_string(),
            state,
            handle,
        )
        .expect("set cursor");
        
        assert_eq!(info.name, "Normal");
        assert!(info.image_path.is_some());
    }

    #[test]
    fn set_cursor_image_removes_with_empty_path() {
        let (_app, handle, state) = prepare_app_state();
        
        // First add a cursor
        {
            let mut cursor = state.cursor.write().unwrap();
            cursor.cursor_paths.insert("Normal".into(), "test.cur".into());
        }

        // Then remove it with empty path
        let info = set_cursor_image(
            "Normal".into(),
            "".into(),
            state,
            handle,
        )
        .expect("remove cursor");
        
        assert!(info.image_path.is_none());
        
        let cursor = state.cursor.read().unwrap();
        assert!(!cursor.cursor_paths.contains_key("Normal"));
    }

    #[test]
    fn set_all_cursors_rejects_missing_file() {
        let (_app, handle, state) = prepare_app_state();
        let result = set_all_cursors("C:/missing.cur".into(), state, handle);
        assert!(result.is_err());
    }

    #[test]
    fn set_all_cursors_returns_all_15_cursor_types() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();
        let result = set_all_cursors(
            cur_path.to_string_lossy().to_string(),
            state,
            handle,
        )
        .expect("set all");
        
        assert_eq!(result.len(), 15);
        for info in &result {
            assert!(info.image_path.is_some());
        }
    }

    #[test]
    fn set_cursor_size_validates_range() {
        let (_app, handle, state) = prepare_app_state();
        
        // Too small
        let result = set_cursor_size(15, state.clone(), handle.clone());
        assert!(result.is_err());
        
        // Too large
        let result = set_cursor_size(513, state.clone(), handle.clone());
        assert!(result.is_err());
        
        // Valid
        let _apply_guard = set_apply_cursor_from_file_with_size_mock_guard(|_p, _i, _s| true);
        let result = set_cursor_size(32, state.clone(), handle.clone());
        assert!(result.is_ok());
    }

    #[test]
    fn set_cursor_size_persists_to_state() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();
        {
            let mut cursor = state.cursor.write().unwrap();
            cursor
                .cursor_paths
                .insert("Normal".into(), cur_path.to_string_lossy().to_string());
        }

        let _apply_guard = set_apply_cursor_from_file_with_size_mock_guard(|_p, _i, _s| true);
        set_cursor_size(128, state.clone(), handle.clone()).expect("set size");
        
        let prefs = state.prefs.read().unwrap();
        assert_eq!(prefs.cursor_size, 128);
    }

    #[test]
    fn test_set_cursor_size_saves_immediately() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();
        {
            let mut cursor = state.cursor.write().unwrap();
            cursor
                .cursor_paths
                .insert("Normal".into(), cur_path.to_string_lossy().to_string());
        }

        let _apply_guard = set_apply_cursor_from_file_with_size_mock_guard(|_p, _i, _s| true);
        
        // Change cursor size
        set_cursor_size(64, state.clone(), handle.clone()).expect("set size 64");
        
        // Verify state was updated immediately
        let prefs = state.prefs.read().unwrap();
        assert_eq!(
            prefs.cursor_size, 64,
            "Cursor size should be updated immediately in state"
        );
    }

    #[test]
    fn test_cursor_size_32px_is_default() {
        let (_app, _handle, state) = prepare_app_state();
        
        let prefs = state.prefs.read().unwrap();
        assert_eq!(
            prefs.cursor_size, 32,
            "Default cursor size must be 32 pixels"
        );
    }

    #[test]
    fn test_cursor_size_change_sequence() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();
        {
            let mut cursor = state.cursor.write().unwrap();
            cursor
                .cursor_paths
                .insert("Normal".into(), cur_path.to_string_lossy().to_string());
        }

        let _apply_guard = set_apply_cursor_from_file_with_size_mock_guard(|_p, _i, _s| true);
        
        // Test: User changes from 32 -> 64 -> 128 -> 96
        set_cursor_size(64, state.clone(), handle.clone()).expect("set 64");
        assert_eq!(state.prefs.read().unwrap().cursor_size, 64);
        
        set_cursor_size(128, state.clone(), handle.clone()).expect("set 128");
        assert_eq!(state.prefs.read().unwrap().cursor_size, 128);
        
        set_cursor_size(96, state.clone(), handle.clone()).expect("set 96");
        assert_eq!(state.prefs.read().unwrap().cursor_size, 96);
    }

    #[test]
    fn test_cursor_size_persists_across_operations() {
        let temp = tempfile::tempdir().expect("tempdir");
        let cur_path = temp.path().join("test.cur");
        std::fs::write(&cur_path, []).expect("write cur");

        let (_app, handle, state) = prepare_app_state();

        let _apply_guard = set_apply_cursor_from_file_with_size_mock_guard(|_p, _i, _s| true);
        
        // Set cursor size to 128
        {
            let mut cursor = state.cursor.write().unwrap();
            cursor
                .cursor_paths
                .insert("Normal".into(), cur_path.to_string_lossy().to_string());
        }
        set_cursor_size(128, state.clone(), handle.clone()).expect("set size");
        
        // Perform other operations - cursor size should remain
        let info = set_cursor_image(
            "Hand".into(),
            cur_path.to_string_lossy().to_string(),
            state.clone(),
            handle.clone(),
        ).expect("set cursor image");
        
        // Verify cursor size is still 128
        let prefs = state.prefs.read().unwrap();
        assert_eq!(
            prefs.cursor_size, 128,
            "Cursor size should persist across other operations"
        );
    }
}
