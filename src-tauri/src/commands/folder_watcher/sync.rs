use super::read_cursor_hotspot;
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::AppHandle;

use crate::commands::customization::pack_commands::{extract_pack_assets, read_manifest_or_infer};
use crate::commands::customization::pack_library;

pub(super) fn sync_library_with_folder_inner(app: &AppHandle) -> Result<(), String> {
    use super::super::customization::library::{load_library, save_library};

    let cursors_folder = crate::paths::cursors_dir()?;
    let packs_folder = crate::paths::cursor_packs_dir()?;

    let files_on_disk = scan_library_files(&cursors_folder, &packs_folder);
    let mut library = load_library(app)?;

    let (files_to_add, files_to_remove) = diff_library_vs_disk(&library, &files_on_disk);
    
    // Also check for packs in deleted directories
    let packs_in_deleted_dirs = find_packs_in_deleted_dirs(&library, &packs_folder);
    let mut files_to_remove_combined = files_to_remove;
    files_to_remove_combined.extend(packs_in_deleted_dirs);

    let changed = apply_folder_diff(&mut library, files_to_add, files_to_remove_combined);

    if changed {
        save_library(app, &library)?;
        cc_debug!("[FolderWatcher] Library synced with folder");
    }

    // Clean up orphaned pack folders after sync
    if let Err(e) = super::super::customization::library::cleanup_orphaned_pack_folders(app) {
        cc_warn!("[FolderWatcher] Failed to cleanup orphaned pack folders: {}", e);
    }

    Ok(())
}

fn scan_library_files(cursors_folder: &PathBuf, packs_folder: &PathBuf) -> HashSet<String> {
    let mut files_on_disk: HashSet<String> = HashSet::new();

    if let Ok(entries) = std::fs::read_dir(cursors_folder) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                continue;
            }

            let ext = path
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("")
                .to_ascii_lowercase();
            if ext == "cur" || ext == "ani" || ext == "zip" {
                files_on_disk.insert(path.to_string_lossy().to_string());
            }
        }
    }

    // Packs: collect only .zip files under cursor-packs recursively.
    // Do NOT add extracted .cur/.ani from inside pack folders into the library.
    if packs_folder.exists() {
        let mut stack: Vec<PathBuf> = vec![packs_folder.clone()];
        while let Some(dir) = stack.pop() {
            let entries = match std::fs::read_dir(&dir) {
                Ok(e) => e,
                Err(_) => continue,
            };

            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                    continue;
                }

                let ext = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase();
                if ext == "zip" {
                    files_on_disk.insert(path.to_string_lossy().to_string());
                }
            }
        }
    }

    files_on_disk
}

/// Check if any cursor packs are in directories that no longer exist
fn find_packs_in_deleted_dirs(
    library: &super::super::customization::library::LibraryData,
    _packs_folder: &PathBuf,
) -> Vec<String> {
    let mut packs_to_remove: Vec<String> = Vec::new();
    
    for cursor in &library.cursors {
        if cursor.is_pack {
            let pack_path = std::path::Path::new(&cursor.file_path);
            if let Some(parent_dir) = pack_path.parent() {
                // If the parent directory doesn't exist anymore, this pack should be removed
                if !parent_dir.exists() {
                    cc_debug!(
                        "[FolderWatcher] Pack {} in deleted directory {}, removing from library",
                        cursor.name,
                        parent_dir.to_string_lossy()
                    );
                    packs_to_remove.push(cursor.file_path.clone());
                }
            }
        }
    }
    
    packs_to_remove
}

fn diff_library_vs_disk(
    library: &super::super::customization::library::LibraryData,
    files_on_disk: &HashSet<String>,
) -> (Vec<String>, Vec<String>) {
    let library_paths: HashSet<String> = library
        .cursors
        .iter()
        .map(|c| c.file_path.clone())
        .collect();

    let files_to_add: Vec<_> = files_on_disk.difference(&library_paths).cloned().collect();
    let files_to_remove: Vec<_> = library_paths.difference(files_on_disk).cloned().collect();

    (files_to_add, files_to_remove)
}

fn apply_folder_diff(
    library: &mut super::super::customization::library::LibraryData,
    files_to_add: Vec<String>,
    files_to_remove: Vec<String>,
) -> bool {
    use super::super::customization::library::LibraryCursor;
    use super::super::customization::library::LibraryPackMetadata;

    let mut changed = false;

    for file_path in files_to_add {
        let path = std::path::Path::new(&file_path);
        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_ascii_lowercase();
        let mut display_name = path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("Cursor")
            .to_string();

        let id = crate::utils::library_meta::new_library_cursor_id();

        let (is_pack, pack_metadata, hotspot_x, hotspot_y) = if ext == "zip" {
            let meta = match read_manifest_or_infer(path) {
                Ok(mut manifest) => {
                    display_name = manifest.pack_name.clone();

                    match extract_pack_assets(&id, path, &manifest) {
                        Ok(extracted_map) => {
                            for item in manifest.items.iter_mut() {
                                if let Some(extracted_path) = extracted_map.get(&item.file_name) {
                                    item.file_path =
                                        Some(extracted_path.to_string_lossy().to_string());
                                }
                            }
                        }
                        Err(err) => {
                            cc_warn!(
                                "[FolderWatcher] Failed to extract pack {} assets: {}",
                                file_path,
                                err
                            );
                        }
                    }

                    let previews = pack_library::generate_pack_previews_from_archive(path).ok();
                    Some(LibraryPackMetadata {
                        mode: manifest.mode,
                        archive_path: file_path.clone(),
                        items: manifest.items,
                        previews_version: previews
                            .as_ref()
                            .map(|_| pack_library::CURRENT_PREVIEW_CACHE_VERSION),
                        previews,
                    })
                }
                Err(err) => {
                    cc_warn!(
                        "[FolderWatcher] Failed to infer cursor pack manifest for {}: {}",
                        file_path,
                        err
                    );
                    None
                }
            };

            (true, meta, 0, 0)
        } else {
            let (hotspot_x, hotspot_y) = read_cursor_hotspot(&file_path).unwrap_or((0, 0));
            (false, None, hotspot_x, hotspot_y)
        };

        let cursor = LibraryCursor {
            id,
            name: display_name,
            file_path,
            click_point_x: hotspot_x,
            click_point_y: hotspot_y,
            created_at: crate::utils::library_meta::now_iso8601_utc(),
            is_pack,
            pack_metadata,
        };

        library.cursors.push(cursor);
        changed = true;
    }

    if !files_to_remove.is_empty() {
        library
            .cursors
            .retain(|c| !files_to_remove.contains(&c.file_path));
        changed = true;
    }

    changed
}
