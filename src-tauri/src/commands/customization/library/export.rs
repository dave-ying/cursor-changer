use std::io::Cursor as IoCursor;
use std::{fs, io::Write};

use tauri::{AppHandle, Runtime};
use tauri_plugin_dialog::DialogExt;
use zip::write::FileOptions;

pub(super) async fn export_library_cursors<R: Runtime>(app: AppHandle<R>) -> Result<Option<String>, String> {
    use std::path::Path;

    let library = super::store::load_library(&app)?;

    if library.cursors.is_empty() {
        return Err("No cursors in library to export".to_string());
    }

    let cursor = IoCursor::new(Vec::new());
    let mut zip_writer = zip::ZipWriter::new(cursor);
    let options: FileOptions<'_, ()> =
        FileOptions::default().compression_method(zip::CompressionMethod::Stored);

    for lib_cursor in &library.cursors {
        let path = Path::new(&lib_cursor.file_path);
        if !path.exists() {
            cc_warn!(
                "[export_library_cursors] Skipping missing file: {}",
                lib_cursor.file_path
            );
            continue;
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("cursor.cur")
            .to_string();

        zip_writer
            .start_file(name, options)
            .map_err(|e| format!("Failed to start zip entry: {}", e))?;

        let data = fs::read(path)
            .map_err(|e| format!("Failed to read file {}: {}", lib_cursor.file_path, e))?;
        zip_writer
            .write_all(&data)
            .map_err(|e| format!("Failed to write to zip: {}", e))?;
    }

    let writer = zip_writer
        .finish()
        .map_err(|e| format!("Failed to finalize zip: {}", e))?;
    let bytes = writer.into_inner();

    let default_path = dirs::desktop_dir()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .unwrap_or_else(|| {
            std::env::var("USERPROFILE")
                .map(|p| format!("{}\\Desktop", p))
                .unwrap_or_else(|_| ".".to_string())
        });

    let file_path = app
        .dialog()
        .file()
        .set_title("Export Library")
        .add_filter("Zip Archive", &["zip"])
        .set_file_name("library.zip")
        .set_directory(&default_path)
        .blocking_save_file();

    match file_path {
        Some(path) => {
            if let Some(path_ref) = path.as_path() {
                let path_str = path_ref.to_string_lossy().to_string();
                fs::write(&path_str, &bytes)
                    .map_err(|e| format!("Failed to write export file: {}", e))?;
                Ok(Some(path_str))
            } else {
                Ok(None)
            }
        }
        None => Ok(None),
    }
}

