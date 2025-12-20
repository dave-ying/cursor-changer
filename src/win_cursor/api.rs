use std::ptr::null_mut;

use winapi::ctypes::c_void;
use winapi::shared::windef::HCURSOR;
use winapi::um::winuser::{
    CreateCursor, LoadImageW, SetSystemCursor, SystemParametersInfoW, IMAGE_CURSOR,
    LR_LOADFROMFILE, SPIF_SENDCHANGE, SPI_SETCURSORS,
};

use crate::win_common::to_wide;

use super::constants::{CURSOR_DIMENSION, CURSOR_IDS, CURSOR_PLANE_BYTES};

unsafe fn create_blank_cursor() -> HCURSOR {
    let and_plane = [0xFFu8; CURSOR_PLANE_BYTES];
    let xor_plane = [0u8; CURSOR_PLANE_BYTES];

    CreateCursor(
        null_mut(),
        0,
        0,
        CURSOR_DIMENSION,
        CURSOR_DIMENSION,
        and_plane.as_ptr().cast::<c_void>(),
        xor_plane.as_ptr().cast::<c_void>(),
    )
}

/// Replace common system cursors with a transparent cursor. Returns true on success.
///
/// # Safety
/// This function is unsafe because it calls Windows API functions that manipulate system cursors.
/// The caller must ensure this is called from a valid Windows context.
#[must_use]
pub unsafe fn apply_blank_system_cursors() -> bool {
    let mut success = true;
    for &cursor_id in &CURSOR_IDS {
        let cursor = create_blank_cursor();
        if cursor.is_null() || SetSystemCursor(cursor, cursor_id) == 0 {
            success = false;
        }
    }
    if !success {
        let _ = restore_system_cursors();
    }
    success
}

/// Restore system cursors using `SystemParametersInfoW(SPI_SETCURSORS)`.
///
/// Note: We use `SPIF_SENDCHANGE` without `SPIF_UPDATEINIFILE` to avoid permission issues.
///
/// # Safety
/// This function is unsafe because it calls Windows API functions.
#[must_use]
pub unsafe fn restore_system_cursors() -> bool {
    // First attempt: Standard approach with SPIF_SENDCHANGE only
    let result = SystemParametersInfoW(SPI_SETCURSORS, 0, null_mut(), SPIF_SENDCHANGE);

    if result != 0 {
        return true;
    }

    // Second attempt: Try without any flags
    let result = SystemParametersInfoW(SPI_SETCURSORS, 0, null_mut(), 0);

    result != 0
}

/// Refresh cursor settings to apply changes from registry.
///
/// This should be called after modifying cursor-related registry values
/// to make Windows reload and apply the changes immediately.
/// Uses `SPIF_SENDCHANGE` to broadcast the change (`SPIF_UPDATEINIFILE` can cause permission issues).
///
/// # Safety
/// This function is unsafe because it calls Windows API functions.
///
/// # Panics
/// May panic if the mock mutex is poisoned (test code only).
#[must_use]
pub unsafe fn refresh_cursor_settings() -> bool {
    #[cfg(test)]
    {
        if let Some(lock) = super::testing::REFRESH_CURSOR_SETTINGS_MOCK.get() {
            let value = lock
                .lock()
                .expect("refresh cursor settings mock poisoned")
                .as_mut()
                .map(|mock| mock());
            if let Some(result) = value {
                return result;
            }
        }
    }
    SystemParametersInfoW(SPI_SETCURSORS, 0, null_mut(), SPIF_SENDCHANGE) != 0
}

/// Load a cursor from a file and apply it to a specific cursor type with explicit size.
/// This allows overriding the system cursor size by loading the cursor at a specific dimension.
///
/// For multi-resolution .cur files, passing the desired size to `LoadImageW` allows Windows
/// to select the best matching resolution from the file, preventing pixelation when scaling.
///
/// # Arguments
/// * `file_path` - Path to the .cur or .ani file
/// * `cursor_id` - The cursor ID (e.g., `OCR_NORMAL`, `OCR_HAND`)
/// * `size` - Desired cursor size in pixels (e.g., 32, 48, 64)
///
/// # Returns
/// `true` if successful, `false` otherwise
///
/// # Safety
/// This function is unsafe because it calls Windows API functions.
#[must_use]
pub unsafe fn apply_cursor_from_file_with_size(file_path: &str, cursor_id: u32, size: i32) -> bool {
    // Convert path to wide string
    let wide_path = to_wide(file_path);

    // Load cursor from file at the requested size.
    // For multi-resolution .cur files, this allows Windows to select the best matching
    // resolution from the file instead of always picking the smallest (32x32) size.
    // This prevents pixelation when displaying larger cursors.
    let cursor = LoadImageW(
        null_mut(),         // hInst (null for files)
        wide_path.as_ptr(), // File path
        IMAGE_CURSOR,       // Type: cursor
        size,               // Desired width - Windows picks best match from .cur
        size,               // Desired height - Windows picks best match from .cur
        LR_LOADFROMFILE,    // Load from file
    ) as HCURSOR;

    if cursor.is_null() {
        eprintln!("LoadImageW failed for {file_path} at size {size}");
        return false;
    }

    // Apply the cursor to the system
    let result = SetSystemCursor(cursor, cursor_id);

    if result == 0 {
        eprintln!("SetSystemCursor failed for cursor ID {cursor_id}");
        return false;
    }

    // Note: We don't destroy the cursor handle because SetSystemCursor takes ownership
    true
}

/// Apply a cursor from a file to all 15 system cursor types with a specific size.
/// This is the main function to use for loading custom cursors with size override.
///
/// # Arguments
/// * `file_path` - Path to the .cur or .ani file
/// * `size` - Desired cursor size in pixels (e.g., 32, 48, 64, 96, 128)
///
/// # Returns
/// `true` if all cursors were applied successfully
///
/// # Safety
/// This function is unsafe because it calls Windows API functions.
#[must_use]
pub unsafe fn apply_cursor_file_with_size(file_path: &str, size: i32) -> bool {
    let mut success = true;

    for &cursor_id in &CURSOR_IDS {
        if !apply_cursor_from_file_with_size(file_path, cursor_id, size) {
            success = false;
            eprintln!("Failed to apply cursor {cursor_id} from {file_path}");
        }
    }

    success
}
