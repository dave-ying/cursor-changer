/// Find a cursor file in a directory by base name, checking supported extensions.
/// Returns the full path to the first matching file found (.ani preferred over .cur).
/// Returns None if no matching file is found.
#[must_use]
pub fn find_cursor_file_in_dir(
    dir: &std::path::Path,
    base_name: &str,
    extensions: &[&str],
) -> Option<std::path::PathBuf> {
    for ext in extensions {
        let filename = format!("{}.{}", base_name, ext);
        let path = dir.join(&filename);
        if path.exists() {
            return Some(path);
        }
    }
    None
}

/// Get the Windows Cursors folder path dynamically (e.g., C:\Windows\Cursors or D:\Windows\Cursors).
/// Works regardless of which drive Windows is installed on.
/// Returns None if unable to determine the path.
#[must_use]
pub fn get_windows_cursors_folder() -> Option<String> {
    use std::env;
    use std::path::PathBuf;

    // Try to get Windows folder from environment variable first
    if let Ok(windir) = env::var("WINDIR") {
        let mut cursors_path = PathBuf::from(windir);
        cursors_path.push("Cursors");
        return cursors_path.to_str().map(std::string::ToString::to_string);
    }

    // Fallback: try common paths
    let common_paths = [
        "C:\\Windows\\Cursors",
        "D:\\Windows\\Cursors",
        "E:\\Windows\\Cursors",
    ];
    for path in &common_paths {
        if std::path::Path::new(path).exists() {
            return Some((*path).to_string());
        }
    }

    None
}
