use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::{Path, PathBuf}};
use tauri::{AppHandle, Manager, Runtime};
use tempfile::NamedTempFile;

use super::{LibraryCursor, LibraryData};
use crate::commands::customization::pack_commands::read_manifest_or_infer;
use crate::commands::customization::pack_library::register_pack_in_library;

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

fn library_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
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

pub fn load_library<R: Runtime>(app: &AppHandle<R>) -> Result<LibraryData, String> {
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
                        is_pack: false,
                        pack_metadata: None,
                    });
                }
                Ok(library)
            }
            Err(e) => Err(format!("Failed to parse library: {}", e)),
        },
    }
}

pub(super) fn save_library<R: Runtime>(app: &AppHandle<R>, library: &LibraryData) -> Result<(), String> {
    let path = library_path(app)?;
    let parent_dir = path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Library path missing parent directory".to_string())?;

    fs::create_dir_all(&parent_dir)
        .map_err(|e| format!("Failed to create library directory: {}", e))?;

    let json = serde_json::to_string_pretty(library)
        .map_err(|e| format!("Failed to serialize library: {}", e))?;

    let mut temp_file = NamedTempFile::new_in(&parent_dir)
        .map_err(|e| format!("Failed to create temporary library file: {}", e))?;

    temp_file
        .write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write temporary library file: {}", e))?;
    temp_file
        .flush()
        .map_err(|e| format!("Failed to flush temporary library file: {}", e))?;
    temp_file
        .as_file()
        .sync_all()
        .map_err(|e| format!("Failed to sync temporary library file: {}", e))?;

    temp_file
        .persist(&path)
        .map_err(|e| format!("Failed to replace library file: {}", e))?;

    Ok(())
}

/// Get candidate paths for the default library root directory
fn default_library_root_candidates<R: Runtime>(app: &AppHandle<R>) -> Vec<std::path::PathBuf> {
    let mut candidates = Vec::new();

    // Resource directory (for production builds)
    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(
            resource_dir
                .join("default-assets")
                .join("library"),
        );
    }

    // Development: current working directory
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(
            cwd.join("src-tauri")
                .join("default-assets")
                .join("library"),
        );
        // If running from src-tauri (cargo tauri dev default), default-assets sits directly under cwd
        candidates.push(
            cwd.join("default-assets")
                .join("library"),
        );
    }

    candidates
}

/// Resolve the default library root directory (from bundled resources)
fn resolve_default_library_root_dir<R: Runtime>(app: &AppHandle<R>) -> Result<std::path::PathBuf, String> {
    let candidates = default_library_root_candidates(app);

    for candidate in &candidates {
        if candidate.exists() {
            return Ok(candidate.clone());
        }
    }

    Err("Failed to resolve default library root directory".to_string())
}

/// Enumerate cursor files in a directory (.cur/.ani only)
fn list_default_library_cursor_files(dir: &Path) -> Result<Vec<PathBuf>, String> {
    let entries =
        fs::read_dir(dir).map_err(|e| format!("Failed to read default library directory: {}", e))?;

    let cursor_files: Vec<PathBuf> = entries
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|path| {
            let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
            ext.eq_ignore_ascii_case("cur") || ext.eq_ignore_ascii_case("ani")
        })
        .collect();

    Ok(cursor_files)
}

/// Structure representing a default cursor pack directory
struct DefaultPackStructure {
    pub name: String,
    pub zip_path: PathBuf,
    pub extracted_cursors_path: Option<PathBuf>,
}

/// Enumerate default cursor packs in the new subdirectory structure
/// Structure:
/// library/cursor-packs/
///   ├── PackName/
///   │   ├── PackName.zip (or any .zip)
///   │   └── cursors/ (optional, contains .cur/.ani files)
fn list_default_pack_structures(dir: &Path) -> Result<Vec<DefaultPackStructure>, String> {
    if !dir.exists() {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read default packs directory: {}", e))?;
    let mut packs = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            let dir_name = path.file_name().and_then(|s| s.to_str()).unwrap_or_default().to_string();
            
            // Find the zip file inside
            let mut zip_path = None;
            let mut cursors_path = None;

            if let Ok(sub_entries) = fs::read_dir(&path) {
                for sub_entry in sub_entries.flatten() {
                    let sub_path = sub_entry.path();
                    if sub_path.is_file() {
                        if let Some(ext) = sub_path.extension().and_then(|s| s.to_str()) {
                            if ext.eq_ignore_ascii_case("zip") {
                                zip_path = Some(sub_path);
                            }
                        }
                    } else if sub_path.is_dir() {
                        if sub_path.file_name().and_then(|s| s.to_str()) == Some("cursors") {
                            cursors_path = Some(sub_path);
                        }
                    }
                }
            }

            if let Some(zip) = zip_path {
                packs.push(DefaultPackStructure {
                    name: dir_name,
                    zip_path: zip,
                    extracted_cursors_path: cursors_path,
                });
            }
        }
    }

    Ok(packs)
}

fn cursor_numeric_prefix(path: &Path) -> Option<u32> {
    path.file_stem()
        .and_then(|s| s.to_str())
        .and_then(|stem| stem.parse::<u32>().ok())
}

fn cursor_sort_key(path: &Path) -> (u32, String) {
    let file_name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let number = cursor_numeric_prefix(path).unwrap_or(u32::MAX);
    (number, file_name)
}

/// Friendly name + created_at for a library entry based on filename and position
fn derive_library_entry_metadata(
    file_name: &str,
    now: DateTime<Utc>,
    total: usize,
    position: usize,
) -> (String, String) {
    let name = file_name
        .trim_end_matches(".cur")
        .trim_end_matches(".CUR")
        .trim_end_matches(".ani")
        .trim_end_matches(".ANI")
        .to_string();

    let days_ago = (total.saturating_sub(position + 1)) as i64;
    let created_at = (now - Duration::days(days_ago)).to_rfc3339();

    (name, created_at)
}

/// Copy a default cursor into the user cursors directory and return the destination path
fn copy_default_cursor_to_user_dir(
    source_path: &Path,
    cursors_dir: &Path,
) -> Result<PathBuf, String> {
    if let Some(parent) = cursors_dir.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create cursors directory: {}", e))?;
    }

    let file_name = source_path
        .file_name()
        .ok_or_else(|| "Source cursor missing filename".to_string())?;
    let dest_path = cursors_dir.join(file_name);

    fs::copy(source_path, &dest_path)
        .map_err(|e| format!("Failed to copy default cursor {}: {}", file_name.to_string_lossy(), e))?;

    Ok(dest_path)
}

fn copy_dir_contents(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let dest_path = dst.join(entry.file_name());
        if entry_path.is_file() {
            fs::copy(&entry_path, &dest_path)?;
        }
        // Not handling recursive subdirectories for now as structure is flat
    }
    Ok(())
}

/// Initialize the library with default cursors by copying from bundled resources
pub fn initialize_library_with_defaults<R: Runtime>(app: &AppHandle<R>) -> Result<LibraryData, String> {
    let default_root = resolve_default_library_root_dir(app)?;
    let default_cursors_dir = default_root.join("cursors");
    let default_packs_dir = default_root.join("cursor-packs");
    let cursors_dir = crate::paths::cursors_dir()?;

    cc_debug!(
        "[CursorChanger] Initializing library with defaults from: {}",
        default_root.display()
    );

    // Deterministic ordering: numeric filename prefixes first (ascending), then case-insensitive name
    let mut cursor_files = if default_cursors_dir.exists() {
        list_default_library_cursor_files(&default_cursors_dir)?
    } else {
        Vec::new()
    };
    cursor_files.sort_by_key(|path| cursor_sort_key(path));

    let now = Utc::now();
    let total_cursors = cursor_files.len();
    let mut library = LibraryData::default();

    // Build in chronological order (oldest -> newest) then reverse to persist newest-first,
    // so default "Custom" order matches "Date Created" (newest to oldest).
    let mut entries: Vec<LibraryCursor> = Vec::new();
    for (position, source_path) in cursor_files.into_iter().enumerate() {
        let file_name = match source_path.file_name().and_then(|s| s.to_str()) {
            Some(name) => name.to_string(),
            None => {
                cc_warn!(
                    "[CursorChanger] Skipping default cursor with invalid filename: {}",
                    source_path.display()
                );
                continue;
            }
        };

        let dest_path = match copy_default_cursor_to_user_dir(&source_path, &cursors_dir) {
            Ok(dest) => dest,
            Err(err) => {
                cc_warn!("[CursorChanger] {err}");
                continue;
            }
        };

        let (click_x, click_y) = read_cursor_click_point(&dest_path).unwrap_or((0, 0));
        let (name, created_at) =
            derive_library_entry_metadata(&file_name, now, total_cursors, position);

        let cursor = LibraryCursor {
            id: crate::utils::library_meta::new_library_cursor_id(),
            name,
            file_path: dest_path.to_string_lossy().to_string(),
            click_point_x: click_x,
            click_point_y: click_y,
            created_at,
            is_pack: false,
            pack_metadata: None,
        };

        entries.push(cursor);
    }

    // Reverse to persist newest-first order by default
    entries.reverse();
    library.cursors.extend(entries);

    // Also register any bundled cursor packs (zip archives)
    let pack_structures = list_default_pack_structures(&default_packs_dir)?;
    let mut pack_count = 0usize;
    
    // Ensure we have a place to put them. using cursor_packs_dir() as defined in paths.rs
    // This is typically library/cursor-packs/
    let user_packs_dir = crate::paths::cursor_packs_dir()?;
    
    for pack in pack_structures {
        let pack_dir = user_packs_dir.join(&pack.name);
        fs::create_dir_all(&pack_dir).map_err(|e| {
            format!(
                "Failed to create default cursor pack folder {}: {}",
                pack_dir.display(),
                e
            )
        })?;

        // Copy archive into user cursor-packs dir
        let dest_path = {
            let file_name = pack.zip_path
                .file_name()
                .and_then(|s| s.to_str())
                .unwrap_or("cursor-pack.zip");

            let target_path = crate::commands::customization::pack_library::ensure_unique_filename(
                &pack_dir,
                file_name,
            );
            
            fs::copy(&pack.zip_path, &target_path).map_err(|e| {
                format!(
                    "Failed to copy default cursor pack {}: {}",
                    file_name, e
                )
            })?;
            target_path
        };

        match read_manifest_or_infer(&dest_path) {
            Ok(manifest) => {
                // Register the pack to get the LibraryCursor and ID
                match crate::commands::customization::pack_library::register_pack_in_library_with_data(
                    app,
                    &mut library,
                    &dest_path,
                    manifest.mode,
                    manifest.items,
                    Some(manifest.created_at),
                ) {
                    Ok(cursor) => {
                        pack_count += 1;
                        
                        // If we have pre-extracted cursors, hydrate the cache
                        if let Some(src_cursors_dir) = pack.extracted_cursors_path {
                            // Resolve the cache folder for this pack
                            // pack_library::pack_extract_folder normally does this logic
                            let cache_dir = pack_dir.join("cursors");
                            
                             if let Err(e) = copy_dir_contents(&src_cursors_dir, &cache_dir) {
                                  cc_warn!(
                                    "[CursorChanger] Failed to pre-hydrate cache for pack {}: {}",
                                    cursor.name,
                                    e
                                );
                             } else {
                                 cc_debug!("[CursorChanger] Pre-hydrated cache for pack {}", cursor.name);
                             }
                        }
                    }
                    Err(err) => {
                         cc_warn!(
                            "[CursorChanger] Failed to register default cursor pack {}: {}",
                            pack.name,
                            err
                        );
                    }
                }
            }
            Err(err) => cc_warn!(
                "[CursorChanger] Skipping default cursor pack {} (manifest inference failed): {}",
                pack.name,
                err
            ),
        }
    }

    cc_debug!(
        "[CursorChanger] Initialized library with {} default cursors and {} default cursor packs",
        library.cursors.len(),
        pack_count
    );

    save_library(app, &library)?;
    Ok(library)
}

/// .CUR file format constants
#[allow(dead_code)]
mod cursor_format {
    /// Size of the ICONDIR header in bytes
    #[allow(dead_code)]
    pub const ICONDIR_SIZE: usize = 6;
    /// Offset to hotspot X coordinate in ICONDIRENTRY (after ICONDIR header)
    pub const HOTSPOT_X_OFFSET: usize = 10;
    /// Offset to hotspot Y coordinate in ICONDIRENTRY
    pub const HOTSPOT_Y_OFFSET: usize = 12;
    /// Minimum bytes needed to read hotspot from cursor file
    pub const MIN_HEADER_SIZE: usize = 14;
}

/// Read click point (hotspot) from a cursor file
fn read_cursor_click_point(path: &std::path::Path) -> Option<(u16, u16)> {
    let data = fs::read(path).ok()?;
    
    // .CUR file format: hotspot is stored in the ICONDIRENTRY after the ICONDIR header
    if data.len() >= cursor_format::MIN_HEADER_SIZE {
        let hotspot_x = u16::from_le_bytes([
            data[cursor_format::HOTSPOT_X_OFFSET],
            data[cursor_format::HOTSPOT_X_OFFSET + 1]
        ]);
        let hotspot_y = u16::from_le_bytes([
            data[cursor_format::HOTSPOT_Y_OFFSET],
            data[cursor_format::HOTSPOT_Y_OFFSET + 1]
        ]);
        return Some((hotspot_x, hotspot_y));
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use tempfile::tempdir;

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
            is_pack: false,
            pack_metadata: None,
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

    #[test]
    fn test_cursor_sorting_numeric_then_alpha() {
        let tmp_dir = tempdir().expect("tmp");
        let dir_path = tmp_dir.path();

        let files = ["10.cur", "2.cur", "alpha.ani", "beta.cur"];
        for file in &files {
            let path = dir_path.join(file);
            fs::write(&path, []).expect("write cursor");
        }

        let mut cursor_files = list_default_library_cursor_files(dir_path).expect("list");
        cursor_files.sort_by_key(|p| cursor_sort_key(p));

        let ordered: Vec<String> = cursor_files
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect();

        assert_eq!(ordered, vec!["2.cur", "10.cur", "alpha.ani", "beta.cur"]);
    }

    #[test]
    fn test_metadata_derivation_trims_extension_and_assigns_dates() {
        let now = Utc.with_ymd_and_hms(2025, 1, 10, 0, 0, 0).unwrap();
        let total = 3;

        let (name_first, created_first) =
            derive_library_entry_metadata("1.cur", now, total, 0);
        let (name_last, created_last) =
            derive_library_entry_metadata("arrow.ANI", now, total, 2);

        assert_eq!(name_first, "1");
        assert!(created_first < created_last, "earlier entries should be older");
        assert_eq!(name_last, "arrow");
    }
}
