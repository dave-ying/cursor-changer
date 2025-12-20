use super::{is_cursor_file, read_cursor_hotspot};
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::AppHandle;

pub(super) fn sync_library_with_folder_inner(app: &AppHandle) -> Result<(), String> {
    use super::super::customization::library::{load_library, save_library};

    let cursors_folder = crate::paths::cursors_dir()?;

    let files_on_disk = scan_cursors_folder(&cursors_folder);
    let mut library = load_library(app)?;

    let (files_to_add, files_to_remove) = diff_library_vs_disk(&library, &files_on_disk);

    let changed = apply_folder_diff(&mut library, files_to_add, files_to_remove);

    if changed {
        save_library(app, &library)?;
        cc_debug!("[FolderWatcher] Library synced with folder");
    }

    Ok(())
}

fn scan_cursors_folder(cursors_folder: &PathBuf) -> HashSet<String> {
    let mut files_on_disk: HashSet<String> = HashSet::new();

    if let Ok(entries) = std::fs::read_dir(cursors_folder) {
        for entry in entries.flatten() {
            let path = entry.path();
            if is_cursor_file(&path) {
                files_on_disk.insert(path.to_string_lossy().to_string());
            }
        }
    }

    files_on_disk
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

    let mut changed = false;

    for file_path in files_to_add {
        let path = std::path::Path::new(&file_path);
        let name = path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("Cursor")
            .to_string();

        let id = crate::utils::library_meta::new_library_cursor_id();

        let (hotspot_x, hotspot_y) = read_cursor_hotspot(&file_path).unwrap_or((0, 0));

        let cursor = LibraryCursor {
            id,
            name,
            file_path,
            click_point_x: hotspot_x,
            click_point_y: hotspot_y,
            created_at: crate::utils::library_meta::now_iso8601_utc(),
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
