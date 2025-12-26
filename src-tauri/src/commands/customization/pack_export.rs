use std::io::Cursor as IoCursor;
use std::{fs, io::Write, path::PathBuf};

use tauri::{AppHandle, State};
use zip::write::FileOptions;

use crate::state::{AppState, CustomizationMode};

use super::library::LibraryPackItem;
use super::pack_library::{ensure_unique_filename, register_pack_in_library};

const SIMPLE_MODE_EXPORT_NAMES: [&str; 2] = ["Normal", "Hand"];

fn resolve_export_names(mode: CustomizationMode) -> Vec<&'static str> {
    match mode {
        CustomizationMode::Simple => SIMPLE_MODE_EXPORT_NAMES.to_vec(),
        CustomizationMode::Advanced => cursor_changer::DEFAULT_CURSOR_BASE_NAMES
            .iter()
            .map(|(cursor_name, _)| *cursor_name)
            .collect(),
    }
}

fn determine_pack_filename(base_name: &str, source_path: &str) -> String {
    let extension = std::path::Path::new(source_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .unwrap_or_else(|| "cur".to_string());

    format!("{}.{}", base_name, extension)
}

fn default_filename(mode: CustomizationMode) -> &'static str {
    match mode {
        CustomizationMode::Simple => "simple-cursor-pack.zip",
        CustomizationMode::Advanced => "advanced-cursor-pack.zip",
    }
}

fn collect_cursor_entries(
    cursor_paths: &std::collections::HashMap<String, String>,
    mode: CustomizationMode,
) -> Vec<(String, String, PathBuf)> {
    let export_names = resolve_export_names(mode);
    let mut entries = Vec::new();

    for (cursor_name, base_name) in cursor_changer::DEFAULT_CURSOR_BASE_NAMES.iter() {
        if !export_names.contains(cursor_name) {
            continue;
        }

        if let Some(source_path) = cursor_paths.get(&cursor_name.to_string()) {
            let path = PathBuf::from(source_path);
            if !path.exists() {
                cc_warn!(
                    "[export_active_cursor_pack] Skipping missing cursor file: {}",
                    source_path
                );
                continue;
            }

            let filename = determine_pack_filename(base_name, source_path);
            entries.push((cursor_name.to_string(), filename, path));
        } else {
            cc_warn!(
                "[export_active_cursor_pack] No cursor path recorded for {}",
                cursor_name
            );
        }
    }

    entries
}

/// Export the currently active cursors into a cursor pack ZIP file.
/// Simple mode exports Normal + Hand, Advanced exports all 15 cursor types.
#[tauri::command]
pub async fn export_active_cursor_pack(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let (cursor_paths, current_mode) = {
        let guard = state
            .read_all()
            .map_err(|e| format!("Failed to lock state: {}", e))?;
        (guard.cursor.cursor_paths.clone(), guard.modes.customization_mode)
    };

    let entries = collect_cursor_entries(&cursor_paths, current_mode);
    if entries.is_empty() {
        return Err("No cursor files available to export".to_string());
    }

    let cursors_dir = crate::paths::cursors_dir()?;
    let target_path = ensure_unique_filename(&cursors_dir, default_filename(current_mode));
    let archive_path_str = target_path.to_string_lossy().to_string();

    let created_at = crate::utils::library_meta::now_iso8601_utc();
    let pack_name = target_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("cursor-pack")
        .to_string();

    let items: Vec<LibraryPackItem> = entries
        .iter()
        .map(|(cursor_name, file_name, _source_path)| {
            let display_name = cursor_changer::CURSOR_TYPES
                .iter()
                .find(|ct| ct.name == cursor_name)
                .map(|ct| ct.display_name.to_string())
                .unwrap_or_else(|| cursor_name.clone());

            LibraryPackItem {
                cursor_name: cursor_name.clone(),
                display_name,
                file_name: file_name.clone(),
                file_path: None,
            }
        })
        .collect();

    let cursor = IoCursor::new(Vec::new());
    let mut zip_writer = zip::ZipWriter::new(cursor);
    let options: FileOptions<'_, ()> =
        FileOptions::default().compression_method(zip::CompressionMethod::Stored);

    for (_cursor_name, pack_filename, source_path) in &entries {
        let data =
            fs::read(source_path).map_err(|e| format!("Failed to read file {}: {}", source_path.display(), e))?;

        zip_writer
            .start_file(pack_filename, options)
            .map_err(|e| format!("Failed to start zip entry {}: {}", pack_filename, e))?;
        zip_writer
            .write_all(&data)
            .map_err(|e| format!("Failed to write {} to zip: {}", pack_filename, e))?;
    }

    let writer = zip_writer
        .finish()
        .map_err(|e| format!("Failed to finalize cursor pack zip: {}", e))?;
    let bytes = writer.into_inner();

    fs::write(&target_path, &bytes).map_err(|e| format!("Failed to write cursor pack: {}", e))?;

    register_pack_in_library(
        &app,
        pack_name,
        &target_path,
        current_mode,
        items,
        Some(created_at),
    )?;

    Ok(Some(archive_path_str))
}
