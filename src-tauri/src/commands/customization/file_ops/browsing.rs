/// File browsing dialog operations
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Browse for cursor file
#[tauri::command]
pub async fn browse_cursor_file(app: AppHandle) -> Result<Option<String>, String> {
    // Default to Desktop folder for intuitive user experience
    let default_path = dirs::desktop_dir()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .unwrap_or_else(|| {
            // Fallback to USERPROFILE\Desktop if dirs crate fails
            std::env::var("USERPROFILE")
                .map(|p| format!("{}\\Desktop", p))
                .unwrap_or_else(|_| ".".to_string())
        });

    // Open file dialog with support for multiple image formats
    let file_path = app
        .dialog()
        .file()
        .set_title("Select Cursor or Image File")
        .add_filter(
            "Cursor & Image Files",
            &["cur", "ani", "svg", "png", "ico", "bmp", "jpg", "jpeg"],
        )
        .add_filter("Cursor Files", &["cur", "ani"])
        .add_filter("Vector Images", &["svg"])
        .add_filter("Raster Images", &["png", "ico", "bmp", "jpg", "jpeg"])
        .add_filter("All Files", &["*"])
        .set_directory(&default_path)
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            if let Some(path_ref) = path.as_path() {
                Ok(Some(path_ref.to_string_lossy().to_string()))
            } else {
                Ok(None)
            }
        }
        None => Ok(None), // User cancelled
    }
}
