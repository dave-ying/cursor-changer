/// Cursor library management - user's personal cursor collection
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::AppHandle;

use crate::state::CustomizationMode;

mod ani;
mod export;
mod preview;
mod store;

/// ANI preview data - frames + timing for frontend animation
/// This is more efficient than GIF conversion:
/// - No GIF encoding overhead
/// - Full RGBA support (no 256 color limit)
/// - Better alpha transparency
/// - Frontend can control playback
#[derive(ts_rs::TS, Serialize, Deserialize, Clone, Debug)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct AniPreviewData {
    /// Base64 PNG data URLs for each frame
    pub frames: Vec<String>,
    /// Delay in milliseconds for each frame
    pub delays: Vec<u32>,
    /// Total animation duration in milliseconds
    pub total_duration: u32,
}

#[derive(ts_rs::TS, Serialize, Deserialize, Clone, Debug, Default)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct LibraryPackItem {
    pub cursor_name: String,
    pub display_name: String,
    pub file_name: String,
    pub file_path: Option<String>,
}

#[derive(ts_rs::TS, Serialize, Deserialize, Clone, Debug)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct LibraryPackMetadata {
    pub mode: CustomizationMode,
    pub archive_path: String,
    pub items: Vec<LibraryPackItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previews: Option<std::collections::HashMap<String, String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(skip)]
    pub previews_version: Option<u32>,
}

#[derive(ts_rs::TS, Serialize, Deserialize, Clone, Debug)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct LibraryCursor {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub click_point_x: u16,
    pub click_point_y: u16,
    pub created_at: String,
    #[serde(default)]
    pub is_pack: bool,
    #[serde(default)]
    pub pack_metadata: Option<LibraryPackMetadata>,
}

#[derive(Serialize, Deserialize, Default, Debug)]
pub struct LibraryData {
    pub cursors: Vec<LibraryCursor>,
}

/// Load the library data from disk
pub fn load_library(app: &AppHandle) -> Result<LibraryData, String> {
    store::load_library(app)
}

/// Save the library data to disk
pub fn save_library(app: &AppHandle, library: &LibraryData) -> Result<(), String> {
    store::save_library(app, library)
}

/// Get all cursors in the library
#[tauri::command]
pub fn get_library_cursors(app: AppHandle) -> Result<Vec<LibraryCursor>, String> {
    let library = load_library(&app)?;
    Ok(library.cursors)
}

/// Add a cursor to the library
#[tauri::command]
pub fn add_cursor_to_library(
    app: AppHandle,
    name: String,
    file_path: String,
    click_point_x: u16,
    click_point_y: u16,
) -> Result<LibraryCursor, String> {
    let mut library = load_library(&app)?;

    // Generate unique ID using system time
    let id = crate::utils::library_meta::new_library_cursor_id();

    // Get current timestamp as ISO-8601 string
    let created_at = crate::utils::library_meta::now_iso8601_utc();

    let cursor = LibraryCursor {
        id: id.clone(),
        name,
        file_path,
        click_point_x,
        click_point_y,
        created_at,
        is_pack: false,
        pack_metadata: None,
    };

    library.cursors.push(cursor.clone());
    save_library(&app, &library)?;

    Ok(cursor)
}

/// Safely delete a library file if it's within the allowed cursors folder.
/// Returns Ok(true) if file was deleted, Ok(false) if skipped (not in folder or doesn't exist),
/// Err if deletion failed.
pub fn try_delete_library_file(file_path: &std::path::Path) -> Result<bool, std::io::Error> {
    let cursors_folder = match crate::paths::cursors_dir() {
        Ok(folder) => folder,
        Err(_) => return Ok(false), // Can't determine folder, skip deletion
    };

    if !file_path.starts_with(&cursors_folder) {
        return Ok(false); // Not in our folder, skip
    }

    if !file_path.exists() {
        return Ok(false); // File doesn't exist, nothing to delete
    }

    fs::remove_file(file_path)?;
    Ok(true)
}

/// Remove a cursor from the library and delete the associated .CUR file
#[tauri::command]
pub fn remove_cursor_from_library(app: AppHandle, id: String) -> Result<(), String> {
    let mut library = load_library(&app)?;

    // Find the cursor to get its file path before removing
    let cursor_to_remove = library.cursors.iter().find(|c| c.id == id).cloned();

    // Remove from library
    library.cursors.retain(|c| c.id != id);
    save_library(&app, &library)?;

    // Delete the library file if it exists in our cursors folder
    if let Some(cursor) = cursor_to_remove {
        let file_path = std::path::Path::new(&cursor.file_path);
        match try_delete_library_file(file_path) {
            Ok(true) => cc_debug!("[CursorChanger] Deleted cursor file: {}", cursor.file_path),
            Ok(false) => {} // Skipped, not in our folder or doesn't exist
            Err(e) => cc_warn!(
                "[CursorChanger] Failed to delete cursor file {}: {}",
                cursor.file_path,
                e
            ),
        }

        // If this was a pack, also remove any extracted cache under `cursor-packs/<id>`.
        if cursor.is_pack {
            if let Ok(cache_root) = crate::paths::pack_cache_dir() {
                let pack_dir = cache_root.join(&cursor.id);
                if pack_dir.exists() {
                    match std::fs::remove_dir_all(&pack_dir) {
                        Ok(()) => cc_debug!(
                            "[CursorChanger] Deleted cursor pack extracted cache: {}",
                            pack_dir.to_string_lossy()
                        ),
                        Err(e) => cc_warn!(
                            "[CursorChanger] Failed to delete pack cache {}: {}",
                            pack_dir.to_string_lossy(),
                            e
                        ),
                    }
                }
            }
        }

        // Clean up any orphaned pack folders after deletion
        if let Err(e) = cleanup_orphaned_pack_folders(&app) {
            cc_warn!("[CursorChanger] Failed to cleanup orphaned pack folders: {}", e);
        }
    }

    Ok(())
}

/// Rename a cursor in the library
#[tauri::command]
pub fn rename_cursor_in_library(
    app: AppHandle,
    id: String,
    new_name: String,
) -> Result<(), String> {
    let mut library = load_library(&app)?;

    let cursor = library
        .cursors
        .iter_mut()
        .find(|c| c.id == id)
        .ok_or_else(|| format!("Cursor with id {} not found", id))?;

    let current_path = PathBuf::from(&cursor.file_path);
    let parent_dir = current_path
        .parent()
        .map(Path::to_path_buf)
        .or_else(|| crate::paths::cursors_dir().ok())
        .ok_or_else(|| "Failed to resolve cursor directory".to_string())?;

    let ext = current_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("cur");

    let desired_name = normalize_display_name(&new_name, ext);
    let safe_base = sanitize_filename(&desired_name);
    let target_path = generate_unique_path(&parent_dir, &safe_base, ext);

    // If the resolved path matches the current one, just update the name in metadata
    if target_path != current_path {
        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to prepare cursor directory: {}", e))?;
        }
        fs::rename(&current_path, &target_path)
            .map_err(|e| format!("Failed to rename cursor file: {}", e))?;
        cursor.file_path = target_path.to_string_lossy().to_string();
    }

    cursor.name = desired_name;

    // Keep pack metadata consistent after rename.
    if cursor.is_pack {
        if let Some(meta) = cursor.pack_metadata.as_mut() {
            meta.archive_path = cursor.file_path.clone();
        }
    }
    save_library(&app, &library)?;
    
    // Sync active cursors if the path changed
    if target_path != current_path {
        crate::commands::customization::cursor_apply_service::sync_active_cursor_update(
            &app, 
            &current_path.to_string_lossy(),
            &target_path.to_string_lossy()
        );
    }
    
    Ok(())
}

/// Strip a redundant extension (e.g. ".cur") from user provided names so we don't end up with
/// filenames like `pointer.cur.cur`, and fall back to the original input if no stem exists.
fn normalize_display_name(new_name: &str, current_ext: &str) -> String {
    let trimmed = new_name.trim();
    if trimmed.is_empty() {
        return "cursor".to_string();
    }

    let name_path = std::path::Path::new(trimmed);
    if let Some(ext) = name_path.extension().and_then(|s| s.to_str()) {
        if ext.eq_ignore_ascii_case(current_ext) {
            if let Some(stem) = name_path.file_stem().and_then(|s| s.to_str()) {
                let stem_trimmed = stem.trim();
                if !stem_trimmed.is_empty() {
                    return stem_trimmed.to_string();
                }
            }
        }
    }

    trimmed.to_string()
}

/// Replace characters that are invalid in filenames with an underscore
fn sanitize_filename(name: &str) -> String {
    const INVALID: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    name.chars()
        .map(|c| if c.is_control() || INVALID.contains(&c) { '_' } else { c })
        .collect()
}

/// Generate a unique file path by appending a numeric suffix when needed
fn generate_unique_path(dir: &Path, base: &str, ext: &str) -> PathBuf {
    let mut attempt = 0;
    loop {
        let file_name = if attempt == 0 {
            format!("{}.{}", base, ext)
        } else {
            format!("{} ({attempt}).{}", base, ext)
        };
        let candidate = dir.join(file_name);
        if !candidate.exists() {
            return candidate;
        }
        attempt += 1;
    }
}

/// Update an existing cursor entry in the library (replace file path, click point and name)
#[tauri::command]
pub fn update_cursor_in_library(
    app: AppHandle,
    id: String,
    name: String,
    file_path: String,
    click_point_x: u16,
    click_point_y: u16,
) -> Result<LibraryCursor, String> {
    let mut library = load_library(&app)?;

    // Find index so we can mutate and then drop the mutable borrow before saving
    if let Some(idx) = library.cursors.iter().position(|c| c.id == id) {
        {
            let cursor = &mut library.cursors[idx];
            cursor.name = name.clone();
            cursor.file_path = file_path.clone();
            cursor.click_point_x = click_point_x;
            cursor.click_point_y = click_point_y;
        }

        // mutable borrow has ended; safe to save and then clone the updated entry
        save_library(&app, &library)?;
        
        let updated_entry = library.cursors[idx].clone();
        
        // Sync active cursors (even if path didn't change, the content might have - e.g. hotspot)
        crate::commands::customization::cursor_apply_service::sync_active_cursor_update(
            &app,
            &updated_entry.file_path, // We pass the same path as both old and new
            &updated_entry.file_path  // because the file content changed in place
        );
        
        Ok(updated_entry)
    } else {
        Err(format!("Cursor with id {} not found", id))
    }
}

/// Reorder the library cursors. `order` is an array of cursor IDs in the
/// desired order. Any IDs not included will be appended in their original order.
#[tauri::command]
pub fn reorder_library_cursors(app: AppHandle, order: Vec<String>) -> Result<(), String> {
    let mut library = load_library(&app)?;

    // Keep the original order so any missing IDs can be appended
    let original = library.cursors.clone();

    let mut seen: HashSet<String> = HashSet::new();
    let mut new_vec: Vec<LibraryCursor> = Vec::new();

    for id in order.iter() {
        if let Some(idx) = original.iter().position(|c| &c.id == id) {
            new_vec.push(original[idx].clone());
            seen.insert(id.clone());
        }
    }

    // Append any originals that weren't listed in `order`, preserving their original order
    for cursor in original.into_iter() {
        if !seen.contains(&cursor.id) {
            new_vec.push(cursor);
        }
    }

    library.cursors = new_vec;
    save_library(&app, &library)?;
    Ok(())
}

/// Get a library cursor's data as a data URL for preview
#[tauri::command]
pub fn get_library_cursor_preview(file_path: String) -> Result<String, String> {
    preview::get_library_cursor_preview(file_path)
}

/// Convert raw cursor bytes (e.g., extracted from a pack) into a data URL preview.
pub fn get_cursor_preview_from_bytes(
    bytes: &[u8],
    file_name: Option<&str>,
) -> Result<String, String> {
    preview::get_library_cursor_preview_from_bytes(bytes, file_name)
}

/// Get ANI preview data as frames + timing for efficient frontend animation.
/// This is more optimized than GIF conversion:
/// - No server-side GIF encoding overhead
/// - Full RGBA color support (no 256 color limit)
/// - Better alpha transparency than GIF
/// - Frontend controls playback (pause, speed, etc.)
///
/// Performance optimizations:
/// - Uses rayon for parallel frame processing
/// - Uses memchr for fast byte pattern searching
/// - Async-compatible via spawn_blocking pattern
#[tauri::command]
pub async fn get_ani_preview_data(file_path: String) -> Result<AniPreviewData, String> {
    ani::get_ani_preview_data(file_path).await
}

/// Export all library cursors into a single ZIP archive and prompt user to save it.
#[tauri::command]
pub async fn export_library_cursors(app: AppHandle) -> Result<Option<String>, String> {
    export::export_library_cursors(app).await
}

/// Clean up orphaned pack extraction folders that don't have corresponding ZIP files in the library
pub fn cleanup_orphaned_pack_folders(app: &AppHandle) -> Result<(), String> {
    let library = load_library(app)?;
    
    // Get all valid pack IDs from the library
    let valid_pack_ids: std::collections::HashSet<String> = library
        .cursors
        .iter()
        .filter(|c| c.is_pack)
        .map(|c| c.id.clone())
        .collect();
    
    if let Ok(cache_root) = crate::paths::pack_cache_dir() {
        if cache_root.exists() {
            if let Ok(entries) = std::fs::read_dir(&cache_root) {
                for entry in entries.flatten() {
                    let path = entry.path();

                    if path.is_dir() {
                        if let Some(folder_name) = path.file_name().and_then(|n| n.to_str()) {
                            if !valid_pack_ids.contains(folder_name) {
                                match std::fs::remove_dir_all(&path) {
                                    Ok(()) => cc_debug!(
                                        "[CursorChanger] Cleaned up orphaned pack folder: {}",
                                        path.to_string_lossy()
                                    ),
                                    Err(e) => cc_warn!(
                                        "[CursorChanger] Failed to clean up orphaned pack folder {}: {}",
                                        path.to_string_lossy(),
                                        e
                                    ),
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(())
}

/// Reset the library by removing all user cursors and restoring default cursors
#[tauri::command]
pub fn reset_library(app: AppHandle) -> Result<(), String> {
    let library = load_library(&app)?;
    
    // Delete all cursor files in our cursors folder
    for cursor in &library.cursors {
        let file_path = std::path::Path::new(&cursor.file_path);
        match try_delete_library_file(file_path) {
            Ok(true) => cc_debug!("[CursorChanger] Deleted cursor file: {}", cursor.file_path),
            Ok(false) => {} // Skipped, not in our folder or doesn't exist
            Err(e) => cc_warn!(
                "[CursorChanger] Failed to delete cursor file {}: {}",
                cursor.file_path,
                e
            ),
        }
    }
    
    // Clean up all extracted pack caches under `cursor-packs/`
    if let Ok(cache_root) = crate::paths::pack_cache_dir() {
        if cache_root.exists() {
            match std::fs::remove_dir_all(&cache_root) {
                Ok(()) => cc_debug!(
                    "[CursorChanger] Deleted all cursor pack extracted caches: {}",
                    cache_root.to_string_lossy()
                ),
                Err(e) => cc_warn!(
                    "[CursorChanger] Failed to delete packs directory {}: {}",
                    cache_root.to_string_lossy(),
                    e
                ),
            }
        }
    }
    
    // Initialize with default library cursors
    store::initialize_library_with_defaults(&app)?;
    
    cc_debug!("[CursorChanger] Library reset to defaults");
    Ok(())
}
