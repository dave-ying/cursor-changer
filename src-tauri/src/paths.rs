use std::path::PathBuf;

pub fn cursors_dir() -> Result<PathBuf, String> {
    let app_data = std::env::var("APPDATA")
        .map_err(|_| "Failed to get APPDATA environment variable".to_string())?;

    let cursors_dir = PathBuf::from(&app_data)
        .join("cursor-changer")
        .join("cursors");

    std::fs::create_dir_all(&cursors_dir)
        .map_err(|e| format!("Failed to create cursors directory: {}", e))?;

    Ok(cursors_dir)
}
