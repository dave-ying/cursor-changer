use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

use super::{LibraryCursor, LibraryData};

#[derive(Serialize, Deserialize, Clone, Debug)]
struct LegacyLibraryCursor {
    pub id: String,
    pub name: String,
    pub file_path: String,
    #[serde(alias = "hotspot_x")]
    pub click_point_x: u16,
    #[serde(alias = "hotspot_y")]
    pub click_point_y: u16,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Default, Debug)]
struct LegacyLibraryData {
    pub cursors: Vec<LegacyLibraryCursor>,
}

fn library_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = match app.path().app_data_dir() {
        Ok(p) => p,
        Err(e) => {
            cc_warn!("[CursorChanger] app.path().app_data_dir() error: {}. Falling back to APPDATA env var.", e);
            std::env::var("APPDATA")
                .map(PathBuf::from)
                .map_err(|err| format!("Failed to obtain APPDATA env for fallback: {}", err))?
        }
    };
    let library_path = app_data_dir.join("cursor-changer").join("library.json");
    cc_debug!(
        "[CursorChanger] Library path resolved to: {}",
        library_path.display()
    );
    Ok(library_path)
}

pub fn load_library(app: &AppHandle) -> Result<LibraryData, String> {
    let path = library_path(app)?;

    if !path.exists() {
        // First run: initialize library with default cursors
        cc_debug!("[CursorChanger] Library does not exist, initializing with defaults");
        return initialize_library_with_defaults(app);
    }

    let contents =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read library: {}", e))?;

    match serde_json::from_str::<LibraryData>(&contents) {
        Ok(library) => Ok(library),
        Err(_) => match serde_json::from_str::<LegacyLibraryData>(&contents) {
            Ok(legacy_library) => {
                let mut library = LibraryData::default();
                for legacy_cursor in legacy_library.cursors {
                    library.cursors.push(LibraryCursor {
                        id: legacy_cursor.id,
                        name: legacy_cursor.name,
                        file_path: legacy_cursor.file_path,
                        click_point_x: legacy_cursor.click_point_x,
                        click_point_y: legacy_cursor.click_point_y,
                        created_at: legacy_cursor.created_at,
                    });
                }
                Ok(library)
            }
            Err(e) => Err(format!("Failed to parse library: {}", e)),
        },
    }
}

pub(super) fn save_library(app: &AppHandle, library: &LibraryData) -> Result<(), String> {
    let path = library_path(app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create library directory: {}", e))?;
    }

    let json = serde_json::to_string_pretty(library)
        .map_err(|e| format!("Failed to serialize library: {}", e))?;

    fs::write(&path, json).map_err(|e| format!("Failed to write library: {}", e))
}

/// Get candidate paths for the default library cursors directory
fn default_library_cursors_dir_candidates(app: &AppHandle) -> Vec<std::path::PathBuf> {
    let mut candidates = Vec::new();

    // Resource directory (for production builds)
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(resource_dir.join("default-cursors").join("library"));
    }

    // Development: current working directory
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(
            cwd.join("src-tauri")
                .join("default-cursors")
                .join("library"),
        );
        // If running from src-tauri (cargo tauri dev default), default-cursors sits directly under cwd
        candidates.push(cwd.join("default-cursors").join("library"));
    }

    candidates
}

/// Resolve the default library cursors directory (from bundled resources)
fn resolve_default_library_cursors_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let candidates = default_library_cursors_dir_candidates(app);

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.clone());
        }
    }

    Err("Failed to resolve default library cursors directory".to_string())
}

/// Initialize the library with default cursors by copying from bundled resources
pub fn initialize_library_with_defaults(app: &AppHandle) -> Result<LibraryData, String> {
    let default_dir = resolve_default_library_cursors_dir(app)?;
    let cursors_dir = crate::paths::cursors_dir()?;
    
    cc_debug!(
        "[CursorChanger] Initializing library with defaults from: {}",
        default_dir.display()
    );
    
    let mut library = LibraryData::default();
    
    // Read all .cur and .ani files from the default library directory
    let entries = fs::read_dir(&default_dir)
        .map_err(|e| format!("Failed to read default library directory: {}", e))?;
    
    let mut cursor_files: Vec<_> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            let path = e.path();
            let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
            ext.eq_ignore_ascii_case("cur") || ext.eq_ignore_ascii_case("ani")
        })
        .collect();
    
    // Sort by filename for consistent ordering
    cursor_files.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
    
    // Sort cursor files in reverse numerical order (1.cur first, 12.cur last)
    cursor_files.sort_by(|a, b| {
        let a_name = a.file_name().to_string_lossy().to_string();
        let b_name = b.file_name().to_string_lossy().to_string();
        
        // Extract numbers from filenames (e.g., "1.cur" -> 1, "10.cur" -> 10)
        let a_num = a_name.split('.').next().and_then(|s| s.parse::<u32>().ok()).unwrap_or(u32::MAX);
        let b_num = b_name.split('.').next().and_then(|s| s.parse::<u32>().ok()).unwrap_or(u32::MAX);
        
        a_num.cmp(&b_num)
    });
    
    // Get the current time for timestamp calculation
    let now = chrono::Utc::now();
    let total_cursors = cursor_files.len();
    
    for (i, entry) in cursor_files.into_iter().enumerate() {
        let source_path = entry.path();
        let file_name = source_path.file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("cursor")
            .to_string();
        
        // Generate a friendly name from the filename (remove extension and number prefix)
        let name = file_name
            .trim_end_matches(".cur")
            .trim_end_matches(".CUR")
            .trim_end_matches(".ani")
            .trim_end_matches(".ANI")
            .to_string();
        
        // Copy to user's cursors directory
        let dest_path = cursors_dir.join(&file_name);
        
        if let Err(e) = fs::copy(&source_path, &dest_path) {
            cc_warn!(
                "[CursorChanger] Failed to copy default cursor {}: {}",
                file_name,
                e
            );
            continue;
        }
        
        // Read click point from the cursor file
        let (click_x, click_y) = read_cursor_click_point(&dest_path).unwrap_or((0, 0));
        
        // Calculate timestamp - newer cursors (lower numbers) get more recent timestamps
        // This makes 1.cur the newest and 12.cur the oldest when sorted by date
        let days_ago = (total_cursors - i - 1) as i64;
        let created_at = (now - chrono::Duration::days(days_ago)).to_rfc3339();
        
        let cursor = LibraryCursor {
            id: crate::utils::library_meta::new_library_cursor_id(),
            name,
            file_path: dest_path.to_string_lossy().to_string(),
            click_point_x: click_x,
            click_point_y: click_y,
            created_at,
        };
        
        library.cursors.push(cursor);
    }
    
    cc_debug!(
        "[CursorChanger] Initialized library with {} default cursors",
        library.cursors.len()
    );
    
    save_library(app, &library)?;
    Ok(library)
}

/// Read click point (hotspot) from a cursor file
fn read_cursor_click_point(path: &std::path::Path) -> Option<(u16, u16)> {
    let data = fs::read(path).ok()?;
    
    // .CUR file format: hotspot is at bytes 10-11 (x) and 12-13 (y) in the directory entry
    // This is after the ICONDIR header (6 bytes) + first 4 bytes of ICONDIRENTRY
    if data.len() >= 14 {
        let hotspot_x = u16::from_le_bytes([data[10], data[11]]);
        let hotspot_y = u16::from_le_bytes([data[12], data[13]]);
        return Some((hotspot_x, hotspot_y));
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_library_data_default() {
        let library = LibraryData::default();
        assert!(library.cursors.is_empty());
    }

    #[test]
    fn test_library_cursor_serialization() {
        let cursor = LibraryCursor {
            id: "test_123".to_string(),
            name: "My Cursor".to_string(),
            file_path: "C:\\test\\cursor.cur".to_string(),
            click_point_x: 10,
            click_point_y: 15,
            created_at: "2025-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&cursor).expect("serialize");
        let parsed: LibraryCursor = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(parsed.id, cursor.id);
        assert_eq!(parsed.name, cursor.name);
        assert_eq!(parsed.file_path, cursor.file_path);
        assert_eq!(parsed.click_point_x, cursor.click_point_x);
        assert_eq!(parsed.click_point_y, cursor.click_point_y);
    }

    #[test]
    fn test_legacy_cursor_conversion() {
        let legacy_json = r#"
        {
            "cursors": [
                {
                    "id": "legacy_1",
                    "name": "Legacy Cursor",
                    "file_path": "/test/legacy.cur",
                    "hotspot_x": 5,
                    "hotspot_y": 8,
                    "created_at": "2025-01-01T00:00:00Z"
                }
            ]
        }"#;

        let legacy_library: LegacyLibraryData =
            serde_json::from_str(legacy_json).expect("deserialize legacy");
        assert_eq!(legacy_library.cursors.len(), 1);
        assert_eq!(legacy_library.cursors[0].click_point_x, 5);
        assert_eq!(legacy_library.cursors[0].click_point_y, 8);
    }

    #[test]
    fn test_backward_compatibility_loading() {
        let legacy_json = r#"
        {
            "cursors": [
                {
                    "id": "legacy_1",
                    "name": "Legacy Cursor",
                    "file_path": "/test/legacy.cur",
                    "hotspot_x": 5,
                    "hotspot_y": 8,
                    "created_at": "2025-01-01T00:00:00Z"
                }
            ]
        }"#;

        match serde_json::from_str::<LibraryData>(legacy_json) {
            Ok(_) => panic!("Should not parse as current format"),
            Err(_) => {
                let legacy_library: LegacyLibraryData =
                    serde_json::from_str(legacy_json).expect("deserialize legacy");
                assert_eq!(legacy_library.cursors.len(), 1);
                assert_eq!(legacy_library.cursors[0].click_point_x, 5);
                assert_eq!(legacy_library.cursors[0].click_point_y, 8);
            }
        }
    }
}
