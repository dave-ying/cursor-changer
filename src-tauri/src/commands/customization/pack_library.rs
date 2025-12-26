use std::path::{Path, PathBuf};

use tauri::AppHandle;

use crate::state::CustomizationMode;
use crate::utils::library_meta::{new_library_cursor_id, now_iso8601_utc};

use super::library::{
    load_library, save_library, LibraryCursor, LibraryPackItem, LibraryPackMetadata,
};

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

    let metadata = LibraryPackMetadata {
        mode,
        archive_path: archive_path.clone(),
        items,
    };

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
