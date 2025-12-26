use std::collections::HashMap;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};

use tauri::AppHandle;
use zip::ZipArchive;

use crate::state::CustomizationMode;
use crate::utils::library_meta::{new_library_cursor_id, now_iso8601_utc};

use super::library::{
    get_cursor_preview_from_bytes, load_library, save_library, LibraryCursor, LibraryPackItem,
    LibraryPackMetadata,
};
use super::pack_manifest::PACK_MANIFEST_FILENAME;

pub(crate) const CURRENT_PREVIEW_CACHE_VERSION: u32 = 1;

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

pub fn register_pack_in_library(
    app: &AppHandle,
    pack_name: String,
    pack_path: &Path,
    mode: CustomizationMode,
    items: Vec<LibraryPackItem>,
    created_at_override: Option<String>,
) -> Result<LibraryCursor, String> {
    let mut library = load_library(app)?;
    let id = new_library_cursor_id();
    let created_at = created_at_override.unwrap_or_else(now_iso8601_utc);
    let archive_path = pack_path.to_string_lossy().to_string();

    let mut metadata = LibraryPackMetadata {
        mode,
        archive_path: archive_path.clone(),
        items,
        previews: None,
        previews_version: None,
    };

    match generate_pack_previews_from_archive(pack_path) {
        Ok(previews) => {
            metadata.previews = Some(previews);
            metadata.previews_version = Some(CURRENT_PREVIEW_CACHE_VERSION);
        }
        Err(err) => {
            cc_warn!(
                "[CursorCustomization] Failed to cache previews for pack {}: {}",
                pack_name,
                err
            );
        }
    }

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
    save_library(app, &library)?;
    Ok(cursor)
}

pub fn ensure_pack_previews(
    app: &AppHandle,
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
