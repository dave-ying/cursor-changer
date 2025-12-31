use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{Read, Seek, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime, State};
use zip::ZipArchive;

use crate::commands::command_helpers;
use crate::state::{AppState, CustomizationMode};

use super::library::{
    get_cursor_preview_from_bytes, load_library, LibraryCursor, LibraryPackItem,
};
use super::pack_library::{
    ensure_pack_previews, prepare_pack_archive_destination,
    register_pack_in_library,
};
use super::pack_manifest::{CursorPackManifest, PACK_MANIFEST_FILENAME};

fn allowed_pack_base_names() -> HashSet<&'static str> {
    cursor_changer::DEFAULT_CURSOR_BASE_NAMES
        .iter()
        .map(|(_windows_name, base_name)| *base_name)
        .collect()
}

fn cursor_pack_required_base_names() -> [&'static str; 2] {
    ["normal-select", "link-select"]
}

fn validate_cursor_pack_archive<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<Vec<LibraryPackItem>, String> {
    let allowed = allowed_pack_base_names();
    let required = cursor_pack_required_base_names();

    let mut total_files = 0usize;
    let mut by_base_name: HashMap<String, String> = HashMap::new();

    for i in 0..archive.len() {
        let entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read archive entry: {e}"))?;

        if entry.is_dir() {
            continue;
        }

        let name_in_zip = entry.name().to_string();
        if name_in_zip.contains('/') || name_in_zip.contains('\\') {
            return Err("Cursor pack zip must not contain folders".to_string());
        }

        let file_name = Path::new(&name_in_zip)
            .file_name()
            .and_then(|s| s.to_str())
            .ok_or_else(|| "Cursor pack zip contains invalid filename".to_string())?
            .to_string();

        total_files += 1;
        if total_files > 15 {
            return Err("Cursor pack zip contains more than 15 files".to_string());
        }

        let ext = Path::new(&file_name)
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();

        if ext != "cur" && ext != "ani" {
            return Err("Cursor pack zip must contain only .cur or .ani files".to_string());
        }

        let stem = Path::new(&file_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        if stem.is_empty() {
            return Err("Cursor pack zip contains a file with no name".to_string());
        }

        if !allowed.contains(stem.as_str()) {
            return Err(format!(
                "Cursor pack zip contains an invalid cursor name: {}",
                stem
            ));
        }

        if by_base_name.contains_key(&stem) {
            return Err(format!(
                "Cursor pack zip contains duplicate cursor for: {}",
                stem
            ));
        }

        by_base_name.insert(stem, file_name);
    }

    for req in required {
        if !by_base_name.contains_key(req) {
            return Err(format!(
                "Cursor pack zip must include {}.cur or {}.ani",
                req, req
            ));
        }
    }

    // Build items in stable order defined by DEFAULT_CURSOR_BASE_NAMES
    let mut items: Vec<LibraryPackItem> = Vec::new();
    for (windows_name, base_name) in cursor_changer::DEFAULT_CURSOR_BASE_NAMES.iter() {
        if let Some(file_name) = by_base_name.get(&base_name.to_string()) {
            let display_name = cursor_changer::CURSOR_TYPES
                .iter()
                .find(|ct| ct.name == *windows_name)
                .map(|ct| ct.display_name.to_string())
                .unwrap_or_else(|| (*base_name).to_string());

            items.push(LibraryPackItem {
                cursor_name: (*base_name).to_string(),
                display_name,
                file_name: file_name.clone(),
                file_path: None,
            });
        }
    }

    if items.is_empty() {
        return Err("Cursor pack zip contains no valid cursor files".to_string());
    }

    Ok(items)
}

fn validate_cursor_pack_bytes(data: &[u8]) -> Result<Vec<LibraryPackItem>, String> {
    let cursor = std::io::Cursor::new(data);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to read archive contents: {e}"))?;
    validate_cursor_pack_archive(&mut archive)
}

fn validate_cursor_pack_path(archive_path: &Path) -> Result<Vec<LibraryPackItem>, String> {
    let file = fs::File::open(archive_path)
        .map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read archive contents: {e}"))?;
    validate_cursor_pack_archive(&mut archive)
}

fn is_zip(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("zip"))
        .unwrap_or(false)
}

#[tauri::command]
pub fn get_cached_pack_previews<R: Runtime>(
    app: AppHandle<R>,
    pack_id: String,
) -> Result<HashMap<String, String>, String> {
    ensure_pack_previews(&app, &pack_id)
}

pub(crate) fn extract_pack_assets(
    pack_id: &str,
    archive_path: &Path,
    manifest: &CursorPackManifest,
) -> Result<HashMap<String, PathBuf>, String> {
    let _ = pack_id;
    if !archive_path.exists() {
        return Err("Cursor pack file not found".to_string());
    }
    if !is_zip(archive_path) {
        return Err("Not a .zip cursor pack".to_string());
    }

    let extract_folder = archive_path
        .parent()
        .ok_or_else(|| "Cursor pack archive missing parent folder".to_string())?
        .to_path_buf();
    fs::create_dir_all(&extract_folder)
        .map_err(|e| format!("Failed to prepare pack folder: {e}"))?;

    let file =
        fs::File::open(archive_path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    let mut extracted = HashMap::new();

    for item in &manifest.items {
        if item.file_name.trim().is_empty() {
            continue;
        }

        let mut zip_file = match archive.by_name(&item.file_name) {
            Ok(entry) => entry,
            Err(err) => {
                cc_warn!(
                    "[CursorCustomization] Cursor file {} missing from archive: {}",
                    item.file_name,
                    err
                );
                continue;
            }
        };

        let extracted_path =
            extract_entry_to_folder(&mut zip_file, &item.file_name, &extract_folder)?;
        extracted.insert(item.file_name.clone(), extracted_path);
    }

    Ok(extracted)
}

fn infer_items_from_archive(archive_path: &Path) -> Result<Vec<LibraryPackItem>, String> {
    let file = fs::File::open(archive_path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    let mut items: Vec<LibraryPackItem> = Vec::new();
    
    cc_debug!("[infer_items_from_archive] Processing archive: {}", archive_path.display());

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

        cc_debug!("[infer_items_from_archive] Found file: {}", file_name);

        if file_name.eq_ignore_ascii_case(PACK_MANIFEST_FILENAME) {
            cc_debug!("[infer_items_from_archive] Skipping manifest file");
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

        cc_debug!("[infer_items_from_archive] Creating item: cursor_name={}, display_name={}, file_name={}", 
                 cursor_name, display_name, file_name);

        items.push(LibraryPackItem {
            cursor_name,
            display_name,
            file_name,
            file_path: None,
        });
    }

    cc_debug!("[infer_items_from_archive] Total items found: {}", items.len());
    Ok(items)
}

pub(crate) fn read_manifest_or_infer(
    archive_path: &Path,
) -> Result<CursorPackManifest, String> {
    let pack_name = archive_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("cursor-pack")
        .to_string();
    let created_at = crate::utils::library_meta::now_iso8601_utc();
    let items = validate_cursor_pack_path(archive_path)?;

    Ok(CursorPackManifest {
        version: 1,
        pack_name,
        mode: CustomizationMode::Advanced,
        created_at,
        items,
    })
}

#[tauri::command]
pub fn import_cursor_pack<R: Runtime>(app: AppHandle<R>, filename: String, data: Vec<u8>) -> Result<LibraryCursor, String> {
    let ext = Path::new(&filename)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    if !ext.eq_ignore_ascii_case("zip") {
        return Err("Only .zip cursor packs are supported".to_string());
    }

    // Validate first so we don't persist invalid packs.
    let validated_items = validate_cursor_pack_bytes(&data)?;

    let packs_dir = crate::paths::cursor_packs_dir()?;
    let target_path = prepare_pack_archive_destination(&packs_dir, &filename)?;

    fs::write(&target_path, &data).map_err(|e| format!("Failed to save cursor pack: {e}"))?;

    register_pack_in_library(
        &app,
        &target_path,
        CustomizationMode::Advanced,
        validated_items,
        Some(crate::utils::library_meta::now_iso8601_utc()),
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
    read_manifest_or_infer(&path)
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

pub(super) fn extract_entry_to_folder<R: Read>(
    mut entry: R,
    file_name: &str,
    folder: &Path,
) -> Result<PathBuf, String> {
    fs::create_dir_all(folder).map_err(|e| format!("Failed to create pack folder: {e}"))?;
    let out_path = folder.join(file_name);
    let mut out = fs::File::create(&out_path).map_err(|e| format!("Failed to create file: {e}"))?;
    std::io::copy(&mut entry, &mut out).map_err(|e| format!("Failed to write file: {e}"))?;
    out.flush().ok();
    Ok(out_path)
}

#[tauri::command]
pub fn apply_cursor_pack<R: Runtime>(app: AppHandle<R>, state: State<'_, AppState>, id: String) -> Result<(), String> {
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

    let manifest = read_manifest_or_infer(&archive_path)?;
    let pack_mode = manifest.mode.clone();

    let extract_folder = archive_path
        .parent()
        .ok_or_else(|| "Cursor pack archive missing parent folder".to_string())?
        .to_path_buf();
    fs::create_dir_all(&extract_folder)
        .map_err(|e| format!("Failed to prepare pack folder: {e}"))?;

    let file = fs::File::open(&archive_path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    let mut cursor_paths: HashMap<String, String> = HashMap::new();
    for item in &manifest.items {
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
