use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use tauri::{AppHandle, Runtime};
use zip::ZipArchive;

use crate::state::CustomizationMode;
use crate::utils::library_meta::now_iso8601_utc;

use super::library::{
    get_cursor_preview_from_bytes, load_library, save_library, LibraryCursor, LibraryData,
    LibraryPackItem, LibraryPackMetadata,
};
use super::pack_manifest::{CursorPackManifest, PACK_MANIFEST_FILENAME};

pub(crate) const CURRENT_PREVIEW_CACHE_VERSION: u32 = 1;

fn is_zip(path: &Path) -> bool {
    path.extension()
        .and_then(|s| s.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("zip"))
        .unwrap_or(false)
}

pub fn ensure_unique_filename(dir: &Path, desired_name: &str) -> PathBuf {
    let mut attempt = 0;
    loop {
        let candidate = if attempt == 0 {
            dir.join(desired_name)
        } else {
            let stem = Path::new(desired_name)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(desired_name);
            let ext = Path::new(desired_name)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");

            if ext.is_empty() {
                dir.join(format!("{stem} ({attempt})"))
            } else {
                dir.join(format!("{stem} ({attempt}).{ext}"))
            }
        };

        if !candidate.exists() {
            return candidate;
        }

        attempt += 1;
    }
}

pub fn ensure_unique_folder(dir: &Path, desired_name: &str) -> PathBuf {
    let mut attempt = 0;
    loop {
        let candidate = if attempt == 0 {
            dir.join(desired_name)
        } else {
            dir.join(format!("{desired_name} ({attempt})"))
        };

        if !candidate.exists() {
            return candidate;
        }

        attempt += 1;
    }
}

pub fn prepare_pack_archive_destination(
    packs_root: &Path,
    desired_filename: &str,
) -> Result<PathBuf, String> {
    let fallback_name = Path::new(desired_filename)
        .file_name()
        .and_then(|s| s.to_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "cursor-pack.zip".to_string());

    let folder_seed = Path::new(&fallback_name)
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("cursor-pack");

    let sanitized_folder = sanitize_folder_name(folder_seed);
    let target_folder = ensure_unique_folder(packs_root, &sanitized_folder);

    fs::create_dir_all(&target_folder).map_err(|e| {
        format!(
            "Failed to create cursor pack folder {}: {}",
            target_folder.display(),
            e
        )
    })?;

    Ok(target_folder.join(fallback_name))
}



fn pack_folder_from_archive(archive_path: &Path) -> Result<PathBuf, String> {
    archive_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Cursor pack archive missing parent folder".to_string())
}



fn sanitize_folder_name(name: &str) -> String {
    const INVALID: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let mut sanitized = name
        .chars()
        .map(|c| if c.is_control() || INVALID.contains(&c) { '_' } else { c })
        .collect::<String>();

    if sanitized.is_empty() {
        sanitized = "cursor-pack".to_string();
    }

    sanitized
}

/// Derive a unique ID and display name for a pack based on its path.
/// The ID is based on the archive filename, and the name is the parent folder name.
fn derive_pack_identity(library: &LibraryData, pack_path: &Path) -> (String, String) {
    let base_name = pack_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("cursor-pack")
        .to_string();

    // Use parent folder name as the display name if available
    let folder_name = pack_path
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|s| s.to_str())
        .unwrap_or(&base_name)
        .to_string();

    // Generate unique ID based on base name
    let mut id = base_name.clone();
    let mut counter = 0;
    while library.cursors.iter().any(|c| c.id == id) {
        counter += 1;
        id = format!("{}-{}", base_name, counter);
    }

    (id, folder_name)
}

/// Get the root directory for storing extracted pack files.


pub fn ensure_pack_files_present(
    archive_path: &Path,
    items: &mut [LibraryPackItem],
) -> Result<(), String> {
    if !archive_path.exists() {
        return Err("Cursor pack file not found".to_string());
    }
    if !is_zip(archive_path) {
        return Err("Not a .zip cursor pack".to_string());
    }

    let pack_folder = pack_folder_from_archive(archive_path)?;
    fs::create_dir_all(&pack_folder)
        .map_err(|e| format!("Failed to prepare pack folder: {}", e))?;

    let archive_file =
        fs::File::open(archive_path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(archive_file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    for item in items.iter_mut() {
        if item.file_name.trim().is_empty() {
            continue;
        }

        let target_path = pack_folder.join(&item.file_name);
        if !target_path.exists() {
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

            let extracted_path = super::pack_commands::extract_entry_to_folder(
                &mut zip_file,
                &item.file_name,
                &pack_folder,
            )?;
            item.file_path = Some(extracted_path.to_string_lossy().to_string());
        } else {
            item.file_path = Some(target_path.to_string_lossy().to_string());
        }
    }

    Ok(())
}



pub fn register_pack_in_library<R: Runtime>(
    app: &AppHandle<R>,
    pack_path: &Path,
    mode: CustomizationMode,
    items: Vec<LibraryPackItem>,
    created_at_override: Option<String>,
) -> Result<LibraryCursor, String> {
    let mut library = load_library(app)?;
    register_pack_in_library_with_data(app, &mut library, pack_path, mode, items, created_at_override)
}

pub fn register_pack_in_library_with_data<R: Runtime>(
    app: &AppHandle<R>,
    library: &mut LibraryData,
    pack_path: &Path,
    mode: CustomizationMode,
    items: Vec<LibraryPackItem>,
    created_at_override: Option<String>,
) -> Result<LibraryCursor, String> {
    let (id, pack_name) = derive_pack_identity(library, pack_path);
    let created_at = created_at_override.unwrap_or_else(now_iso8601_utc);
    let archive_path = pack_path.to_string_lossy().to_string();

    // Generate previews immediately so they are available in the frontend without a refresh
    let (previews, previews_version) = match generate_pack_previews_from_archive(pack_path) {
        Ok(p) => (Some(p), Some(CURRENT_PREVIEW_CACHE_VERSION)),
        Err(e) => {
             cc_warn!("[CursorChanger] Failed to generate pack previews for {}: {}", pack_name, e);
             (None, None)
        }
    };

    let mut metadata = LibraryPackMetadata {
        mode,
        archive_path: archive_path.clone(),
        items,
        previews,
        previews_version,
    };

    ensure_pack_files_present(pack_path, &mut metadata.items)?;

    let cursor = LibraryCursor {
        id: id.clone(),
        name: pack_name,
        file_path: archive_path,
        click_point_x: 0,
        click_point_y: 0,
        created_at,
        is_pack: true,
        pack_metadata: Some(metadata),
    };

    library.cursors.push(cursor.clone());
    save_library(app, library)?;
    Ok(cursor)
}

pub fn ensure_pack_previews<R: Runtime>(
    app: &AppHandle<R>,
    pack_id: &str,
) -> Result<HashMap<String, String>, String> {
    let mut library = load_library(app)?;
    let cursor = library
        .cursors
        .iter_mut()
        .find(|c| c.id == pack_id)
        .ok_or_else(|| format!("Cursor pack with id {} not found", pack_id))?;

    let metadata = cursor
        .pack_metadata
        .as_mut()
        .ok_or_else(|| "Cursor is not a pack".to_string())?;

    if let Some(previews) = &metadata.previews {
        if metadata
            .previews_version
            .unwrap_or_default()
            >= CURRENT_PREVIEW_CACHE_VERSION
        {
            return Ok(previews.clone());
        }
    }

    let archive_path = PathBuf::from(&metadata.archive_path);
    let previews = generate_pack_previews_from_archive(&archive_path)?;
    metadata.previews = Some(previews.clone());
    metadata.previews_version = Some(CURRENT_PREVIEW_CACHE_VERSION);
    save_library(app, &library)?;
    Ok(previews)
}

pub fn generate_pack_previews_from_archive(
    archive_path: &Path,
) -> Result<HashMap<String, String>, String> {
    if !archive_path.exists() {
        return Err("Cursor pack file not found".to_string());
    }
    if !archive_path
        .extension()
        .and_then(|s| s.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("zip"))
        .unwrap_or(false)
    {
        return Err("Not a .zip cursor pack".to_string());
    }

    let file =
        fs::File::open(archive_path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;

    let mut previews = HashMap::new();

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
        previews.insert(file_name, data_url);
    }

    Ok(previews)
}
