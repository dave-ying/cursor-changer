use std::path::PathBuf;
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Save a .cur file with a file save dialog
#[tauri::command]
pub async fn save_cursor_file(
    app: AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<Option<String>, String> {
    // Default to Desktop folder for intuitive user experience
    let default_path = dirs::desktop_dir()
        .and_then(|p| p.to_str().map(|s| s.to_string()))
        .unwrap_or_else(|| {
            // Fallback to USERPROFILE\Desktop if dirs crate fails
            std::env::var("USERPROFILE")
                .map(|p| format!("{}\\Desktop", p))
                .unwrap_or_else(|_| ".".to_string())
        });

    // Open save file dialog
    let file_path = app
        .dialog()
        .file()
        .set_title("Save Cursor File")
        .add_filter("Cursor Files", &["cur"])
        .set_file_name(&filename)
        .set_directory(&default_path)
        .blocking_save_file();

    match file_path {
        Some(path) => {
            if let Some(path_ref) = path.as_path() {
                let path_str = path_ref.to_string_lossy().to_string();

                // Write the data to the file
                std::fs::write(&path_str, &data)
                    .map_err(|e| format!("Failed to save file: {}", e))?;

                Ok(Some(path_str))
            } else {
                Ok(None)
            }
        }
        None => Ok(None), // User cancelled
    }
}

/// Save a cursor file to a temporary location without user dialog
#[tauri::command]
pub fn save_temp_cursor_file(
    _app: AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    // Get Windows Cursors folder as temporary location
    let cursors_dir = cursor_changer::get_windows_cursors_folder()
        .unwrap_or_else(|| "C:\\Windows\\Cursors".to_string());

    let temp_path = PathBuf::from(&cursors_dir).join(&filename);
    let temp_path_str = temp_path.to_string_lossy().to_string();

    // Write the data to the file
    std::fs::write(&temp_path_str, &data)
        .map_err(|e| format!("Failed to save temporary file: {}", e))?;

    Ok(temp_path_str)
}

/// Save a cursor file to AppData temp location (user-writable, no admin needed)
#[tauri::command]
pub fn save_cursor_to_appdata(
    _app: AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    let cursors_dir = crate::paths::cursors_dir()?;

    let file_path = cursors_dir.join(&filename);
    let file_path_str = file_path.to_string_lossy().to_string();

    // Write the data to the file
    std::fs::write(&file_path_str, &data)
        .map_err(|e| format!("Failed to save cursor file: {}", e))?;

    Ok(file_path_str)
}

/// Get the path to the library cursors folder
#[tauri::command]
pub fn get_library_cursors_folder() -> Result<String, String> {
    let cursors_dir = crate::paths::cursors_dir()?;
    Ok(cursors_dir.to_string_lossy().to_string())
}

/// Open the library cursors folder in Windows Explorer
#[tauri::command]
pub fn show_library_cursors_folder() -> Result<(), String> {
    let folder_path = get_library_cursors_folder()?;

    // Open folder in Windows Explorer
    std::process::Command::new("explorer")
        .arg(&folder_path)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}
