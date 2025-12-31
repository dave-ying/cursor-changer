use std::fs;
use std::path::{Path, PathBuf};

pub fn library_root_dir() -> Result<PathBuf, String> {
    let app_data = std::env::var("APPDATA")
        .map_err(|_| "Failed to get APPDATA environment variable".to_string())?;

    let app_dir = PathBuf::from(&app_data).join("cursor-changer");
    let library_dir = app_dir.join("library");
    let legacy_cursors_dir = app_dir.join("cursors");

    migrate_legacy_cursors_dir(&legacy_cursors_dir, &library_dir)?;

    fs::create_dir_all(&library_dir)
        .map_err(|e| format!("Failed to create library directory: {}", e))?;

    ensure_library_layout(&library_dir)?;

    Ok(library_dir)
}

pub fn cursors_dir() -> Result<PathBuf, String> {
    let library_dir = library_root_dir()?;
    let cursors_dir = library_dir.join("cursors");
    fs::create_dir_all(&cursors_dir)
        .map_err(|e| format!("Failed to create cursors directory: {}", e))?;
    Ok(cursors_dir)
}

pub fn cursor_packs_dir() -> Result<PathBuf, String> {
    let library_dir = library_root_dir()?;
    let packs_dir = library_dir.join("cursor-packs");
    fs::create_dir_all(&packs_dir)
        .map_err(|e| format!("Failed to create cursor packs directory: {}", e))?;
    Ok(packs_dir)
}

pub fn pack_cache_dir() -> Result<PathBuf, String> {
    cursor_packs_dir()
}

pub fn ani_preview_cache_dir() -> Result<PathBuf, String> {
    let library_dir = library_root_dir()?;
    let previews_dir = library_dir.join("ani-previews");
    fs::create_dir_all(&previews_dir)
        .map_err(|e| format!("Failed to create ANI previews directory: {}", e))?;
    Ok(previews_dir)
}

fn ensure_library_layout(library_dir: &Path) -> Result<(), String> {
    let cursors_dir = library_dir.join("cursors");
    let packs_dir = library_dir.join("cursor-packs");
    let obsolete_packs_dir = library_dir.join(".packs");

    if obsolete_packs_dir.exists() && obsolete_packs_dir.is_dir() {
        cc_debug!("[paths] Cleaning up obsolete .packs directory");
        let _ = fs::remove_dir_all(&obsolete_packs_dir);
    }

    fs::create_dir_all(&cursors_dir)
        .map_err(|e| format!("Failed to create cursors directory: {}", e))?;
    fs::create_dir_all(&packs_dir)
        .map_err(|e| format!("Failed to create cursor packs directory: {}", e))?;

    migrate_library_files(library_dir, &cursors_dir, &packs_dir)?;
    relocate_files_with_extensions(&cursors_dir, &packs_dir, &["zip"])?;
    relocate_files_with_extensions(&packs_dir, &cursors_dir, &["cur", "ani"])?;
    Ok(())
}

fn migrate_legacy_cursors_dir(legacy_dir: &Path, target_dir: &Path) -> Result<(), String> {
    if !legacy_dir.exists() || target_dir.exists() {
        return Ok(());
    }

    match fs::rename(legacy_dir, target_dir) {
        Ok(_) => Ok(()),
        Err(rename_err) => {
            copy_dir_recursive(legacy_dir, target_dir).map_err(|copy_err| {
                format!(
                    "Failed to migrate legacy cursors directory (rename error: {rename_err}; copy error: {copy_err})"
                )
            })?;

            // Best-effort cleanup of the legacy directory; ignore errors.
            let _ = fs::remove_dir_all(legacy_dir);
            Ok(())
        }
    }
}

fn migrate_library_files(
    library_dir: &Path,
    cursors_dir: &Path,
    packs_dir: &Path,
) -> Result<(), String> {
    if !library_dir.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(library_dir)
        .map_err(|e| format!("Failed to inspect library directory: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();

        if path == cursors_dir || path == packs_dir {
            continue;
        }
        if path.is_dir() {
            continue;
        }

        let extension = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_ascii_lowercase());

        match extension.as_deref() {
            Some("cur") | Some("ani") => move_file_if_needed(&path, cursors_dir)?,
            Some("zip") => move_file_if_needed(&path, packs_dir)?,
            _ => {}
        }
    }

    Ok(())
}

fn move_file_if_needed(file_path: &Path, target_dir: &Path) -> Result<(), String> {
    let file_name = match file_path.file_name() {
        Some(name) => name,
        None => return Ok(()),
    };

    let destination = target_dir.join(file_name);
    if destination.exists() {
        return Ok(());
    }

    fs::create_dir_all(target_dir)
        .map_err(|e| format!("Failed to prepare target directory: {}", e))?;

    match fs::rename(file_path, &destination) {
        Ok(_) => Ok(()),
        Err(rename_err) => {
            fs::copy(file_path, &destination)
                .map_err(|copy_err| {
                    format!(
                        "Failed to relocate {} (rename error: {rename_err}; copy error: {copy_err})",
                        file_path.display()
                    )
                })?;
            if let Err(remove_err) = fs::remove_file(file_path) {
                cc_warn!(
                    "[CursorChanger] Failed to delete legacy file {} after copying: {}",
                    file_path.display(),
                    remove_err
                );
            }
            Ok(())
        }
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let dest_path = dst.join(entry.file_name());
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            copy_dir_recursive(&entry_path, &dest_path)?;
        } else {
            fs::copy(&entry_path, &dest_path)?;
        }
    }
    Ok(())
}

fn relocate_files_with_extensions(
    source_dir: &Path,
    target_dir: &Path,
    extensions: &[&str],
) -> Result<(), String> {
    if !source_dir.exists() {
        return Ok(());
    }

    let entries = fs::read_dir(source_dir)
        .map_err(|e| format!("Failed to scan {}: {}", source_dir.display(), e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            continue;
        }

        let ext = path
            .extension()
            .and_then(|s| s.to_str())
            .map(|s| s.to_ascii_lowercase());

        if let Some(ext_str) = ext.as_deref() {
            if extensions.iter().any(|candidate| candidate.eq_ignore_ascii_case(ext_str)) {
                move_file_if_needed(&path, target_dir)?;
            }
        }
    }

    Ok(())
}
