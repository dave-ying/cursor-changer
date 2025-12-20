use super::paths;

/// Mapping of cursor types to their default bundle cursor base names (without extension)
/// These files are located in `src-tauri/default-cursors/` (bundled with the Tauri frontend)
/// The actual file extension (.cur or .ani) is determined at runtime by searching the directory
pub const DEFAULT_CURSOR_BASE_NAMES: [(&str, &str); 15] = [
    ("Normal", "normal-select"),
    ("IBeam", "text-select"),
    ("Hand", "link-select"),
    ("Wait", "busy"),
    ("SizeNS", "vertical-resize"),
    ("SizeWE", "horizontal-resize"),
    ("SizeNWSE", "diagonal-resize-1"),
    ("SizeNESW", "diagonal-resize-2"),
    ("SizeAll", "move"),
    ("Help", "help-select"),
    ("No", "unavailable"),
    ("AppStarting", "working-in-background"),
    ("Up", "alternate-select"),
    ("Cross", "precision-select"),
    ("Pen", "pen"),
];

/// Supported cursor file extensions in order of preference
pub const CURSOR_EXTENSIONS: [&str; 2] = ["ani", "cur"];

/// Legacy constant for backward compatibility - maps to .cur files
/// Deprecated: Use DEFAULT_CURSOR_BASE_NAMES and find_cursor_file_in_dir instead
pub const DEFAULT_CURSOR_FILES: [(&str, &str); 15] = [
    ("Normal", "normal-select.cur"),
    ("IBeam", "text-select.cur"),
    ("Hand", "link-select.cur"),
    ("Wait", "busy.cur"),
    ("SizeNS", "vertical-resize.cur"),
    ("SizeWE", "horizontal-resize.cur"),
    ("SizeNWSE", "diagonal-resize-1.cur"),
    ("SizeNESW", "diagonal-resize-2.cur"),
    ("SizeAll", "move.cur"),
    ("Help", "help-select.cur"),
    ("No", "unavailable.cur"),
    ("AppStarting", "working-in-background.cur"),
    ("Up", "alternate-select.cur"),
    ("Cross", "precision-select.cur"),
    ("Pen", "pen.cur"),
];

/// Get the default cursor file name for a cursor type (legacy, returns .cur extension).
/// Returns None if the cursor type is not found.
/// Deprecated: Use get_default_cursor_base_name and find_cursor_file_in_dir instead
#[must_use]
pub fn get_default_cursor_file(cursor_name: &str) -> Option<&'static str> {
    DEFAULT_CURSOR_FILES
        .iter()
        .find(|(name, _)| *name == cursor_name)
        .map(|(_, file)| *file)
}

/// Get the default cursor base name (without extension) for a cursor type.
/// Returns None if the cursor type is not found.
#[must_use]
pub fn get_default_cursor_base_name(cursor_name: &str) -> Option<&'static str> {
    DEFAULT_CURSOR_BASE_NAMES
        .iter()
        .find(|(name, _)| *name == cursor_name)
        .map(|(_, base_name)| *base_name)
}

/// Find a cursor file in a directory by base name, checking supported extensions.
/// Returns the full path to the first matching file found (.ani preferred over .cur).
/// Returns None if no matching file is found.
#[must_use]
pub fn find_cursor_file_in_dir(
    dir: &std::path::Path,
    base_name: &str,
) -> Option<std::path::PathBuf> {
    paths::find_cursor_file_in_dir(dir, base_name, &CURSOR_EXTENSIONS)
}

/// Find the default cursor file for a cursor type in a directory.
/// Searches for the cursor by base name with any supported extension (.ani, .cur).
/// Returns the full path to the cursor file, or None if not found.
#[must_use]
pub fn find_default_cursor_in_dir(
    dir: &std::path::Path,
    cursor_name: &str,
) -> Option<std::path::PathBuf> {
    get_default_cursor_base_name(cursor_name)
        .and_then(|base_name| find_cursor_file_in_dir(dir, base_name))
}

/// Get the Windows Cursors folder path dynamically (e.g., C:\Windows\Cursors or D:\Windows\Cursors).
/// Works regardless of which drive Windows is installed on.
/// Returns None if unable to determine the path.
#[must_use]
pub fn get_windows_cursors_folder() -> Option<String> {
    paths::get_windows_cursors_folder()
}
