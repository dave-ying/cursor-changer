use std::path::PathBuf;

use crate::state::AppState;

pub trait CursorPreviewDeps {
    fn state_cursor_path(&self, cursor_name: &str) -> Option<String>;
    fn registry_cursor_path(&self, cursor_type: &cursor_changer::CursorType) -> Option<String>;
    fn resolve_default_cursor_path(
        &self,
        cursor_style: &str,
        cursor_name: &str,
    ) -> Result<Option<PathBuf>, String>;
    fn preview_for_file(&self, file_path: String) -> Result<String, String>;
    fn path_exists(&self, file_path: &str) -> bool;
    fn placeholder_svg(&self, cursor_display_name: &str) -> String;
}

pub struct CursorPreviewResolver<D> {
    deps: D,
}

impl<D: CursorPreviewDeps> CursorPreviewResolver<D> {
    pub fn new(deps: D) -> Self {
        Self { deps }
    }

    pub fn try_state_preview(&self, cursor_name: &str) -> Option<String> {
        let image_path = self.deps.state_cursor_path(cursor_name)?;
        if !self.deps.path_exists(&image_path) {
            return None;
        }
        self.deps.preview_for_file(image_path).ok()
    }

    pub fn try_registry_preview(&self, cursor_type: &cursor_changer::CursorType) -> Option<String> {
        let image_path = self.deps.registry_cursor_path(cursor_type)?;
        if !self.deps.path_exists(&image_path) {
            return None;
        }
        self.deps.preview_for_file(image_path).ok()
    }

    pub fn try_default_preview(
        &self,
        cursor_style: &str,
        cursor_name: &str,
    ) -> Result<Option<String>, String> {
        let default_path = self
            .deps
            .resolve_default_cursor_path(cursor_style, cursor_name)?;

        let Some(default_path) = default_path else {
            return Ok(None);
        };

        let file_path = default_path.to_string_lossy().to_string();
        Ok(self.deps.preview_for_file(file_path).ok())
    }

    pub fn placeholder_data_url(&self, cursor_display_name: &str) -> String {
        use base64::Engine;

        let svg_content = self.deps.placeholder_svg(cursor_display_name);
        format!(
            "data:image/svg+xml;base64,{}",
            base64::engine::general_purpose::STANDARD.encode(svg_content.as_bytes())
        )
    }

    pub fn resolve_preview(
        &self,
        cursor_name: &str,
        cursor_style: &str,
        cursor_type: &cursor_changer::CursorType,
    ) -> Result<String, String> {
        if let Some(preview) = self.try_state_preview(cursor_name) {
            return Ok(preview);
        }

        if let Some(preview) = self.try_registry_preview(cursor_type) {
            return Ok(preview);
        }

        if let Some(preview) = self.try_default_preview(cursor_style, cursor_name)? {
            return Ok(preview);
        }

        Ok(self.placeholder_data_url(cursor_type.display_name))
    }
}

pub struct TauriCursorPreviewDeps<'a> {
    state: &'a AppState,
    app: &'a tauri::AppHandle,
}

impl<'a> TauriCursorPreviewDeps<'a> {
    pub fn new(state: &'a AppState, app: &'a tauri::AppHandle) -> Self {
        Self { state, app }
    }
}

impl CursorPreviewDeps for TauriCursorPreviewDeps<'_> {
    fn state_cursor_path(&self, cursor_name: &str) -> Option<String> {
        let guard = self.state.cursor.read().ok()?;
        guard.cursor_paths.get(cursor_name).cloned()
    }

    fn registry_cursor_path(&self, cursor_type: &cursor_changer::CursorType) -> Option<String> {
        cursor_changer::read_cursor_image_from_registry(cursor_type)
    }

    fn resolve_default_cursor_path(
        &self,
        cursor_style: &str,
        cursor_name: &str,
    ) -> Result<Option<PathBuf>, String> {
        crate::cursor_defaults::resolve_default_cursor_path(self.app, cursor_style, cursor_name)
    }

    fn preview_for_file(&self, file_path: String) -> Result<String, String> {
        super::library::get_library_cursor_preview(file_path)
    }

    fn path_exists(&self, file_path: &str) -> bool {
        std::path::Path::new(file_path).exists()
    }

    fn placeholder_svg(&self, cursor_display_name: &str) -> String {
        super::query::create_placeholder_svg(cursor_display_name)
    }
}

#[cfg(test)]
mod tests {
    use std::{
        collections::{HashMap, HashSet},
        path::PathBuf,
        sync::{Arc, Mutex},
    };

    use super::{CursorPreviewDeps, CursorPreviewResolver};

    #[derive(Clone)]
    struct TestDeps {
        state_path: Option<String>,
        registry_path: Option<String>,
        default_path: Result<Option<PathBuf>, String>,
        exists: HashSet<String>,
        previews: HashMap<String, Result<String, String>>,
        calls: Arc<Mutex<Vec<&'static str>>>,
    }

    impl TestDeps {
        fn record(&self, name: &'static str) {
            let mut guard = self.calls.lock().unwrap();
            guard.push(name);
        }
    }

    impl CursorPreviewDeps for TestDeps {
        fn state_cursor_path(&self, _cursor_name: &str) -> Option<String> {
            self.record("state_cursor_path");
            self.state_path.clone()
        }

        fn registry_cursor_path(
            &self,
            _cursor_type: &cursor_changer::CursorType,
        ) -> Option<String> {
            self.record("registry_cursor_path");
            self.registry_path.clone()
        }

        fn resolve_default_cursor_path(
            &self,
            _cursor_style: &str,
            _cursor_name: &str,
        ) -> Result<Option<PathBuf>, String> {
            self.record("resolve_default_cursor_path");
            self.default_path.clone()
        }

        fn preview_for_file(&self, file_path: String) -> Result<String, String> {
            self.record("preview_for_file");
            self.previews
                .get(&file_path)
                .cloned()
                .unwrap_or_else(|| Err("preview not configured".to_string()))
        }

        fn path_exists(&self, file_path: &str) -> bool {
            self.record("path_exists");
            self.exists.contains(file_path)
        }

        fn placeholder_svg(&self, cursor_display_name: &str) -> String {
            self.record("placeholder_svg");
            format!("<svg><text>{}</text></svg>", cursor_display_name)
        }
    }

    fn cursor_type() -> cursor_changer::CursorType {
        cursor_changer::CursorType {
            id: 1,
            name: "Normal",
            registry_key: "Arrow",
            display_name: "Normal select",
        }
    }

    #[test]
    fn try_state_preview_returns_preview_when_available() {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let deps = TestDeps {
            state_path: Some("state.cur".to_string()),
            registry_path: Some("reg.cur".to_string()),
            default_path: Ok(Some(PathBuf::from("default.cur"))),
            exists: HashSet::from_iter(["state.cur".to_string()]),
            previews: HashMap::from_iter([(
                "state.cur".to_string(),
                Ok("preview_state".to_string()),
            )]),
            calls: calls.clone(),
        };

        let resolver = CursorPreviewResolver::new(deps);
        let result = resolver.try_state_preview("Normal");
        assert_eq!(result.as_deref(), Some("preview_state"));

        let calls = calls.lock().unwrap().clone();
        assert!(calls.contains(&"state_cursor_path"));
        assert!(calls.contains(&"path_exists"));
        assert!(calls.contains(&"preview_for_file"));
        assert!(!calls.contains(&"registry_cursor_path"));
    }

    #[test]
    fn try_registry_preview_returns_preview_when_state_missing() {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let deps = TestDeps {
            state_path: None,
            registry_path: Some("reg.cur".to_string()),
            default_path: Ok(None),
            exists: HashSet::from_iter(["reg.cur".to_string()]),
            previews: HashMap::from_iter([("reg.cur".to_string(), Ok("preview_reg".to_string()))]),
            calls: calls.clone(),
        };

        let resolver = CursorPreviewResolver::new(deps);
        let result = resolver.try_registry_preview(&cursor_type());
        assert_eq!(result.as_deref(), Some("preview_reg"));

        let calls = calls.lock().unwrap().clone();
        assert!(calls.contains(&"registry_cursor_path"));
    }

    #[test]
    fn try_default_preview_returns_preview_when_resolved() {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let deps = TestDeps {
            state_path: None,
            registry_path: None,
            default_path: Ok(Some(PathBuf::from("default.cur"))),
            exists: HashSet::new(),
            previews: HashMap::from_iter([(
                "default.cur".to_string(),
                Ok("preview_default".to_string()),
            )]),
            calls: calls.clone(),
        };

        let resolver = CursorPreviewResolver::new(deps);
        let result = resolver
            .try_default_preview("windows", "Normal")
            .expect("default preview result");
        assert_eq!(result.as_deref(), Some("preview_default"));

        let calls = calls.lock().unwrap().clone();
        assert!(calls.contains(&"resolve_default_cursor_path"));
        assert!(calls.contains(&"preview_for_file"));
    }

    #[test]
    fn placeholder_data_url_is_base64_svg_data_url() {
        use base64::Engine;

        let calls = Arc::new(Mutex::new(Vec::new()));
        let deps = TestDeps {
            state_path: None,
            registry_path: None,
            default_path: Ok(None),
            exists: HashSet::new(),
            previews: HashMap::new(),
            calls: calls.clone(),
        };

        let resolver = CursorPreviewResolver::new(deps);
        let data_url = resolver.placeholder_data_url("Normal select");
        assert!(data_url.starts_with("data:image/svg+xml;base64,"));

        let encoded = data_url.strip_prefix("data:image/svg+xml;base64,").unwrap();
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .expect("decode base64");
        let decoded = String::from_utf8(decoded).expect("utf8");
        assert!(decoded.contains("Normal select"));

        let calls = calls.lock().unwrap().clone();
        assert!(calls.contains(&"placeholder_svg"));
    }

    #[test]
    fn resolve_preview_falls_back_in_order() {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let deps = TestDeps {
            state_path: Some("state.cur".to_string()),
            registry_path: Some("reg.cur".to_string()),
            default_path: Ok(Some(PathBuf::from("default.cur"))),
            exists: HashSet::from_iter(["state.cur".to_string(), "reg.cur".to_string()]),
            previews: HashMap::from_iter([
                ("state.cur".to_string(), Err("bad state".to_string())),
                ("reg.cur".to_string(), Ok("preview_reg".to_string())),
            ]),
            calls: calls.clone(),
        };

        let resolver = CursorPreviewResolver::new(deps);
        let result = resolver
            .resolve_preview("Normal", "windows", &cursor_type())
            .expect("resolve");
        assert_eq!(result, "preview_reg");

        let calls = calls.lock().unwrap().clone();
        let state_idx = calls
            .iter()
            .position(|&c| c == "state_cursor_path")
            .unwrap();
        let reg_idx = calls
            .iter()
            .position(|&c| c == "registry_cursor_path")
            .unwrap();
        assert!(state_idx < reg_idx);
    }
}
