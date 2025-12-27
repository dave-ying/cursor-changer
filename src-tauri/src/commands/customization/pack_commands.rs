use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use zip::ZipArchive;

use crate::commands::command_helpers;
use crate::state::{AppState, CustomizationMode};

use super::library::{
    get_cursor_preview_from_bytes, load_library, LibraryCursor, LibraryPackItem,
};
use super::pack_library::{
    ensure_pack_previews, ensure_unique_filename, register_pack_in_library,
};
use super::pack_manifest::{read_manifest_from_path, CursorPackManifest, PACK_MANIFEST_FILENAME};

fn is_zip(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("zip"))
        .unwrap_or(false)
}

#[tauri::command]
pub fn get_cached_pack_previews(
    app: AppHandle,
    pack_id: String,
) -> Result<HashMap<String, String>, String> {
    ensure_pack_previews(&app, &pack_id)
}

fn pack_storage_root() -> Result<PathBuf, String> {
    Ok(crate::paths::cursors_dir()?.join(".packs"))
}

fn infer_items_from_archive(archive_path: &Path) -> Result<Vec<LibraryPackItem>, String> {
    let file = fs::File::open(archive_path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    let mut items: Vec<LibraryPackItem> = Vec::new();

    for i in 0..archive.len() {
        let file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read archive entry: {e}"))?;
        if file.is_dir() {
            continue;
        }

        let name_in_zip = file.name().to_string();
        let file_name = Path::new(&name_in_zip)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or(&name_in_zip)
            .to_string();

        if file_name.eq_ignore_ascii_case(PACK_MANIFEST_FILENAME) {
            continue;
        }

        let stem = Path::new(&file_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("");

        let cursor_name = cursor_changer::DEFAULT_CURSOR_BASE_NAMES
            .iter()
            .find(|(_cursor_name, base_name)| *base_name == stem)
            .map(|(_, base_name)| (*base_name).to_string())
            .unwrap_or_else(|| stem.to_string());

        let display_name = if cursor_name.is_empty() {
            stem.to_string()
        } else {
            // Map kebab-case cursor_name back to Windows cursor name for display lookup
            cursor_changer::DEFAULT_CURSOR_BASE_NAMES
                .iter()
                .find(|(_, base_name)| *base_name == cursor_name)
                .and_then(|(windows_name, _)| {
                    cursor_changer::CURSOR_TYPES
                        .iter()
                        .find(|ct| ct.name == *windows_name)
                        .map(|ct| ct.display_name.to_string())
                })
                .unwrap_or_else(|| cursor_name.clone())
        };

        items.push(LibraryPackItem {
            cursor_name,
            display_name,
            file_name,
            file_path: None,
        });
    }

    Ok(items)
}

pub(crate) fn read_manifest_or_infer(
    archive_path: &Path,
) -> Result<(CustomizationMode, String, String, Vec<LibraryPackItem>), String> {
    match read_manifest_from_path(archive_path) {
        Ok(manifest) => Ok((manifest.mode, manifest.pack_name, manifest.created_at, manifest.items)),
        Err(_) => {
            let pack_name = archive_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("cursor-pack")
                .to_string();
            let created_at = crate::utils::library_meta::now_iso8601_utc();
            let items = infer_items_from_archive(archive_path)?;
            Ok((CustomizationMode::Advanced, pack_name, created_at, items))
        }
    }
}

#[tauri::command]
pub fn import_cursor_pack(app: AppHandle, filename: String, data: Vec<u8>) -> Result<LibraryCursor, String> {
    let ext = Path::new(&filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    if !ext.eq_ignore_ascii_case("zip") {
        return Err("Only .zip cursor packs are supported".to_string());
    }

    let cursors_dir = crate::paths::cursors_dir()?;
    let target_path = ensure_unique_filename(&cursors_dir, &filename);

    fs::write(&target_path, &data).map_err(|e| format!("Failed to save cursor pack: {e}"))?;

    let (mode, pack_name, created_at, items) = read_manifest_or_infer(&target_path)?;

    register_pack_in_library(
        &app,
        pack_name,
        &target_path,
        mode,
        items,
        Some(created_at),
    )
}

#[derive(Serialize, Deserialize, Clone, Debug, ts_rs::TS)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct PackFilePreview {
    pub file_name: String,
    pub data_url: String,
}

#[tauri::command]
pub fn get_cursor_pack_manifest(archive_path: String) -> Result<CursorPackManifest, String> {
    let path = PathBuf::from(&archive_path);
    if !path.exists() {
        return Err("Cursor pack file not found".to_string());
    }
    if !is_zip(&path) {
        return Err("Not a .zip cursor pack".to_string());
    }
    read_manifest_from_path(&path)
}

#[tauri::command]
pub fn get_cursor_pack_file_previews(archive_path: String) -> Result<Vec<PackFilePreview>, String> {
    let path = PathBuf::from(&archive_path);
    if !path.exists() {
        return Err("Cursor pack file not found".to_string());
    }
    if !is_zip(&path) {
        return Err("Not a .zip cursor pack".to_string());
    }

    let file = fs::File::open(&path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    let mut previews = Vec::new();

    for i in 0..archive.len() {
        let mut entry =
            archive
                .by_index(i)
                .map_err(|e| format!("Failed to read archive entry: {e}"))?;
        if entry.is_dir() {
            continue;
        }

        let name_in_zip = entry.name().to_string();
        let file_name = Path::new(&name_in_zip)
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or(&name_in_zip)
            .to_string();

        if file_name.eq_ignore_ascii_case(PACK_MANIFEST_FILENAME) {
            continue;
        }

        let ext = Path::new(&file_name)
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_lowercase());

        if !matches!(ext.as_deref(), Some("cur") | Some("ani") | Some("ico")) {
            continue;
        }

        let mut bytes = Vec::new();
        entry
            .read_to_end(&mut bytes)
            .map_err(|e| format!("Failed to read cursor file from archive: {e}"))?;

        let data_url = get_cursor_preview_from_bytes(&bytes, Some(&file_name))?;
        previews.push(PackFilePreview { file_name, data_url });
    }

    Ok(previews)
}

fn extract_entry_to_folder<R: Read>(mut entry: R, file_name: &str, folder: &Path) -> Result<PathBuf, String> {
    fs::create_dir_all(folder).map_err(|e| format!("Failed to create pack folder: {e}"))?;
    let out_path = folder.join(file_name);
    let mut out = fs::File::create(&out_path).map_err(|e| format!("Failed to create file: {e}"))?;
    std::io::copy(&mut entry, &mut out).map_err(|e| format!("Failed to write file: {e}"))?;
    out.flush().ok();
    Ok(out_path)
}

#[tauri::command]
pub fn apply_cursor_pack(app: AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    let library = load_library(&app)?;
    let pack = library
        .cursors
        .iter()
        .find(|c| c.id == id)
        .cloned()
        .ok_or_else(|| "Cursor pack not found in library".to_string())?;

    if !pack.is_pack {
        return Err("Selected library item is not a cursor pack".to_string());
    }

    let archive_path = PathBuf::from(&pack.file_path);
    if !archive_path.exists() {
        return Err("Cursor pack file not found".to_string());
    }
    if !is_zip(&archive_path) {
        return Err("Cursor pack file is not a .zip".to_string());
    }

    let (pack_mode, _pack_name, _created_at, items) = read_manifest_or_infer(&archive_path)?;

    let storage_root = pack_storage_root()?;
    let extract_folder = storage_root.join(&id);

    let file = fs::File::open(&archive_path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    let mut cursor_paths: HashMap<String, String> = HashMap::new();
    for item in &items {
        if item.cursor_name.trim().is_empty() {
            continue;
        }

        let mut zip_file = match archive.by_name(&item.file_name) {
            Ok(f) => f,
            Err(_) => continue,
        };

        let extracted_path = extract_entry_to_folder(&mut zip_file, &item.file_name, &extract_folder)?;
        
        // Convert kebab-case cursor_name back to Windows cursor name for application
        let windows_cursor_name = cursor_changer::DEFAULT_CURSOR_BASE_NAMES
            .iter()
            .find(|(_, base_name)| *base_name == item.cursor_name)
            .map(|(windows_name, _)| windows_name.to_string())
            .unwrap_or_else(|| item.cursor_name.clone());
            
        cursor_paths.insert(
            windows_cursor_name,
            extracted_path.to_string_lossy().to_string(),
        );
    }

    if cursor_paths.is_empty() {
        return Err("Cursor pack contains no recognized cursor files".to_string());
    }

    let cursor_size = state
        .prefs
        .read()
        .map_err(|e| format!("Failed to lock state: {e}"))?
        .cursor_size;

    match pack_mode {
        CustomizationMode::Simple => {
            if !cursor_paths.contains_key("Normal") || !cursor_paths.contains_key("Hand") {
                return Err("Simple cursor pack must contain Normal and Hand".to_string());
            }
            crate::cursor_defaults::apply_cursor_paths_simple(&cursor_paths, cursor_size);
        }
        CustomizationMode::Advanced => {
            crate::cursor_defaults::apply_cursor_paths_advanced(&cursor_paths, cursor_size);
        }
    }

    let new_paths_for_state = cursor_paths.clone();
    let _ = command_helpers::update_state_and_emit(&app, &state, false, |guard| {
        guard.modes.customization_mode = pack_mode;
        guard.cursor.cursor_paths = new_paths_for_state;
        guard.cursor.last_loaded_cursor_path = None;
        Ok(())
    })?;

    Ok(())
}
