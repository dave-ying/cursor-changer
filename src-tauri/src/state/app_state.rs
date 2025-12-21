use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::sync::{RwLock, RwLockReadGuard, RwLockWriteGuard};

use super::models::{CustomizationMode, DefaultCursorStyle, ThemeMode};

pub const DEFAULT_SHORTCUT: &str = "Ctrl+Shift+X";

/// Information about a single cursor type
#[derive(ts_rs::TS, Serialize, Deserialize, Debug, Clone)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct CursorInfo {
    pub id: u32,
    pub name: String,
    pub display_name: String,
    pub image_path: Option<String>,
}

#[derive(Debug)]
pub struct CursorRuntimeState {
    pub hidden: bool,
    pub last_loaded_cursor_path: Option<String>,
    // Track cursor paths in memory (not in registry)
    // Map of cursor name -> image path
    pub cursor_paths: HashMap<String, String>,
}

impl Default for CursorRuntimeState {
    fn default() -> Self {
        Self {
            hidden: false,
            last_loaded_cursor_path: None,
            cursor_paths: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct ModeCustomizationState {
    // Separate cursor configurations for Simple and Advanced modes
    pub simple_mode_cursor_paths: HashMap<String, String>,
    pub advanced_mode_cursor_paths: HashMap<String, String>,
    // Current customization mode: "simple" or "advanced"
    pub customization_mode: CustomizationMode,
}

impl Default for ModeCustomizationState {
    fn default() -> Self {
        Self {
            simple_mode_cursor_paths: HashMap::new(),
            advanced_mode_cursor_paths: HashMap::new(),
            customization_mode: CustomizationMode::Simple,
        }
    }
}

#[derive(Debug, Clone)]
pub struct PreferencesState {
    pub shortcut: Option<String>,
    pub shortcut_enabled: bool,
    pub run_on_startup: bool,
    pub minimize_to_tray: bool,
    pub cursor_size: i32,
    // User-selected accent color for UI elements (hex format, e.g., "#7c3aed")
    pub accent_color: String,
    // Theme mode: "light", "dark", or "system"
    pub theme_mode: ThemeMode,
    // Default cursor style: "windows" or "mac"
    pub default_cursor_style: DefaultCursorStyle,
}

impl Default for PreferencesState {
    fn default() -> Self {
        Self {
            shortcut: Some(DEFAULT_SHORTCUT.to_string()),
            shortcut_enabled: false,
            run_on_startup: false,
            minimize_to_tray: true,
            cursor_size: 32,
            accent_color: "#7c3aed".to_string(),
            theme_mode: ThemeMode::default(),
            default_cursor_style: DefaultCursorStyle::default(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct RestorationState {
    pub cursor_registry_snapshot: Option<HashMap<String, Option<String>>>,
}

impl Default for RestorationState {
    fn default() -> Self {
        Self {
            cursor_registry_snapshot: None,
        }
    }
}

#[derive(Debug)]
pub struct AppState {
    pub prefs: RwLock<PreferencesState>,
    pub modes: RwLock<ModeCustomizationState>,
    pub cursor: RwLock<CursorRuntimeState>,
    pub restoration: RwLock<RestorationState>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            prefs: RwLock::new(PreferencesState::default()),
            modes: RwLock::new(ModeCustomizationState::default()),
            cursor: RwLock::new(CursorRuntimeState::default()),
            restoration: RwLock::new(RestorationState::default()),
        }
    }
}

pub struct AppStateReadGuard<'a> {
    pub prefs: RwLockReadGuard<'a, PreferencesState>,
    pub modes: RwLockReadGuard<'a, ModeCustomizationState>,
    pub cursor: RwLockReadGuard<'a, CursorRuntimeState>,
    pub restoration: RwLockReadGuard<'a, RestorationState>,
}

pub struct AppStateWriteGuard<'a> {
    pub prefs: RwLockWriteGuard<'a, PreferencesState>,
    pub modes: RwLockWriteGuard<'a, ModeCustomizationState>,
    pub cursor: RwLockWriteGuard<'a, CursorRuntimeState>,
    pub restoration: RwLockWriteGuard<'a, RestorationState>,
}

impl AppState {
    pub fn read_all(&self) -> Result<AppStateReadGuard<'_>, String> {
        let prefs = self
            .prefs
            .read()
            .map_err(|_| "Application state poisoned".to_string())?;
        let modes = self
            .modes
            .read()
            .map_err(|_| "Application state poisoned".to_string())?;
        let cursor = self
            .cursor
            .read()
            .map_err(|_| "Application state poisoned".to_string())?;
        let restoration = self
            .restoration
            .read()
            .map_err(|_| "Application state poisoned".to_string())?;
        Ok(AppStateReadGuard {
            prefs,
            modes,
            cursor,
            restoration,
        })
    }

    pub fn write_all(&self) -> Result<AppStateWriteGuard<'_>, String> {
        let prefs = self
            .prefs
            .write()
            .map_err(|_| "Application state poisoned".to_string())?;
        let modes = self
            .modes
            .write()
            .map_err(|_| "Application state poisoned".to_string())?;
        let cursor = self
            .cursor
            .write()
            .map_err(|_| "Application state poisoned".to_string())?;
        let restoration = self
            .restoration
            .write()
            .map_err(|_| "Application state poisoned".to_string())?;
        Ok(AppStateWriteGuard {
            prefs,
            modes,
            cursor,
            restoration,
        })
    }
}

// Shared atomic flag so the window event handler can read the minimize preference without locking.
#[derive(Clone)]
pub struct MinimizePreference(pub Arc<AtomicBool>);

impl Default for MinimizePreference {
    fn default() -> Self {
        Self(Arc::new(AtomicBool::new(true)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;
    use std::sync::atomic::Ordering;

    #[test]
    fn test_app_state_default() {
        let state = AppState::default();
        let cursor = state.cursor.read().unwrap();
        let prefs = state.prefs.read().unwrap();
        assert_eq!(cursor.hidden, false);
        assert_eq!(prefs.shortcut, Some(DEFAULT_SHORTCUT.to_string()));
        assert_eq!(prefs.run_on_startup, false);
        assert_eq!(prefs.minimize_to_tray, true);
        assert_eq!(prefs.cursor_size, 32);
    }

    #[test]
    fn test_app_state_default_cursor_size_is_32px() {
        let state = AppState::default();
        let prefs = state.prefs.read().unwrap();
        assert_eq!(
            prefs.cursor_size, 32,
            "Default cursor size must be 32 pixels"
        );
    }

    #[test]
    fn test_app_state_cursor_size_can_be_changed() {
        let mut state = AppState::default();
        {
            let prefs = state.prefs.read().unwrap();
            assert_eq!(prefs.cursor_size, 32);
        }

        {
            let mut prefs = state.prefs.write().unwrap();
            prefs.cursor_size = 128;
        }
        {
            let prefs = state.prefs.read().unwrap();
            assert_eq!(prefs.cursor_size, 128);
        }

        {
            let mut prefs = state.prefs.write().unwrap();
            prefs.cursor_size = 64;
        }
        {
            let prefs = state.prefs.read().unwrap();
            assert_eq!(prefs.cursor_size, 64);
        }
    }

    #[test]
    fn test_minimize_preference_default() {
        let pref = MinimizePreference::default();
        assert_eq!(pref.0.load(Ordering::SeqCst), true);
    }

    #[test]
    fn test_minimize_preference_atomic_operations() {
        let pref = MinimizePreference::default();
        pref.0.store(false, Ordering::SeqCst);
        assert_eq!(pref.0.load(Ordering::SeqCst), false);

        pref.0.store(true, Ordering::SeqCst);
        assert_eq!(pref.0.load(Ordering::SeqCst), true);
    }

    #[test]
    fn test_cursor_info_serialization() {
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
}
