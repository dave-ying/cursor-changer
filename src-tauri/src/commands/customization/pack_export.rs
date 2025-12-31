use std::io::Cursor as IoCursor;
use std::{fs, io::Write, path::PathBuf};

use tauri::{AppHandle, State};
use zip::write::FileOptions;

use crate::cursor_defaults::populate_missing_cursor_paths_with_defaults;
use crate::state::{AppState, CustomizationMode};

use super::library::LibraryPackItem;
use super::pack_library::{prepare_pack_archive_destination, register_pack_in_library};

const SIMPLE_MODE_EXPORT_NAMES: [&str; 2] = ["Normal", "Hand"];
const MAX_PACK_NAME_LEN: usize = 55;
const INVALID_FILENAME_CHARS: [char; 9] = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

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

fn sanitize_pack_filename(input: &str) -> Option<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut sanitized = trimmed
        .chars()
        .map(|c| if c.is_control() || INVALID_FILENAME_CHARS.contains(&c) { '_' } else { c })
        .collect::<String>();

    sanitized = sanitized.chars().take(MAX_PACK_NAME_LEN).collect();
    let sanitized = sanitized.trim_matches('.');

    if sanitized.is_empty() {
        None
    } else {
        Some(sanitized.to_string())
    }
}

fn determine_target_filename(mode: CustomizationMode, user_pack_name: Option<String>) -> String {
    if let Some(name) = user_pack_name.and_then(|value| sanitize_pack_filename(&value)) {
        let mut file_name = name;
        if !file_name.to_ascii_lowercase().ends_with(".zip") {
            file_name.push_str(".zip");
        }
        return file_name;
    }

    default_filename(mode).to_string()
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
    pack_name: Option<String>,
) -> Result<Option<String>, String> {
    let (mut cursor_paths, current_mode, cursor_style) = {
        let guard = state
            .read_all()
            .map_err(|e| format!("Failed to lock state: {}", e))?;
        (
            guard.cursor.cursor_paths.clone(),
            guard.modes.customization_mode,
            guard.prefs.default_cursor_style,
        )
    };

    populate_missing_cursor_paths_with_defaults(
        &app,
        cursor_style.as_str(),
        &mut cursor_paths,
    )?;

    let entries = collect_cursor_entries(&cursor_paths, current_mode);
    if entries.is_empty() {
        return Err("No cursor files available to export".to_string());
    }

    let packs_dir = crate::paths::cursor_packs_dir()?;
    let desired_filename = determine_target_filename(current_mode, pack_name);
    let target_path = prepare_pack_archive_destination(&packs_dir, &desired_filename)?;
    let archive_path_str = target_path.to_string_lossy().to_string();

    let created_at = crate::utils::library_meta::now_iso8601_utc();

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

    // Extract ZIP contents to the same folder for immediate access
    if let Some(pack_folder) = target_path.parent() {
        let archive_file = fs::File::open(&target_path)
            .map_err(|e| format!("Failed to open pack archive for extraction: {}", e))?;
        let mut archive = zip::ZipArchive::new(archive_file)
            .map_err(|e| format!("Failed to read pack archive for extraction: {}", e))?;

        for i in 0..archive.len() {
            let mut entry = archive
                .by_index(i)
                .map_err(|e| format!("Failed to read archive entry: {}", e))?;

            if entry.is_dir() {
                continue;
            }

            let entry_name = entry.name().to_string();
            let out_path = pack_folder.join(&entry_name);

            let mut out_file = fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create extracted file {}: {}", entry_name, e))?;
            std::io::copy(&mut entry, &mut out_file)
                .map_err(|e| format!("Failed to extract file {}: {}", entry_name, e))?;
        }
    }

    register_pack_in_library(
        &app,
        &target_path,
        current_mode,
        items,
        Some(created_at),
    )?;

    Ok(Some(archive_path_str))
}
