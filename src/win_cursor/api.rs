use std::ptr::null_mut;
use windows::Win32::Foundation::HANDLE;
use windows::Win32::UI::WindowsAndMessaging::{
    CopyImage, CreateCursor, LoadImageW, SetSystemCursor, SystemParametersInfoW, HCURSOR,
    IMAGE_CURSOR, LR_LOADFROMFILE, SPIF_SENDCHANGE, SPI_SETCURSORS, SYSTEM_CURSOR_ID,
};

use crate::win_common::to_wide;

use super::constants::{CURSOR_DIMENSION, CURSOR_IDS, CURSOR_PLANE_BYTES};

unsafe fn create_blank_cursor() -> HCURSOR {
    let and_plane = [0xFFu8; CURSOR_PLANE_BYTES];
    let xor_plane = [0u8; CURSOR_PLANE_BYTES];

    CreateCursor(
        None,
        0,
        0,
        CURSOR_DIMENSION,
        CURSOR_DIMENSION,
        and_plane.as_ptr().cast(),
        xor_plane.as_ptr().cast(),
    ).expect("Failed to create blank cursor")
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
        if cursor.is_invalid() || SetSystemCursor(cursor, SYSTEM_CURSOR_ID(cursor_id)).is_err() {
            success = false;
        }
    }
    if !success {
        let _ = restore_system_cursors();
    }
    success
}

#[must_use]
pub unsafe fn restore_system_cursors() -> bool {
    // First attempt: Standard approach with SPIF_SENDCHANGE only
    let result = SystemParametersInfoW(SPI_SETCURSORS, 0, Some(null_mut()), SPIF_SENDCHANGE);

    if result.is_ok() {
        return true;
    }

    // Second attempt: Try without any flags
    let result = SystemParametersInfoW(SPI_SETCURSORS, 0, Some(null_mut()), Default::default());

    result.is_ok()
}

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
    SystemParametersInfoW(SPI_SETCURSORS, 0, Some(null_mut()), SPIF_SENDCHANGE).is_ok()
}

#[must_use]
pub unsafe fn apply_cursor_from_file_with_size(file_path: &str, cursor_id: u32, size: i32) -> bool {
    // Convert path to wide string
    let wide_path = to_wide(file_path);
    let path_pcwstr = windows::core::PCWSTR::from_raw(wide_path.as_ptr());

    // Try loading at the exact requested size first
    let mut cursor = LoadImageW(
        None,
        path_pcwstr,
        IMAGE_CURSOR,
        size,
        size,
        LR_LOADFROMFILE,
    ).map(|h| HCURSOR(h.0)).unwrap_or(HCURSOR::default());

    // If exact size fails, try common sizes from largest to smallest
    if cursor.is_invalid() {
        let fallback_sizes: [i32; 8] = [256, 192, 160, 144, 128, 96, 64, 32];
        
        for &candidate in &fallback_sizes {
            cursor = LoadImageW(
                None,
                path_pcwstr,
                IMAGE_CURSOR,
                candidate,
                candidate,
                LR_LOADFROMFILE,
            ).map(|h| HCURSOR(h.0)).unwrap_or(HCURSOR::default());

            if !cursor.is_invalid() {
                // Successfully loaded at fallback size, now scale to requested size
                if let Ok(scaled_h) = CopyImage(
                    HANDLE(cursor.0),
                    IMAGE_CURSOR,
                    size,
                    size,
                    Default::default(), // Don't delete original in case scaling fails
                ) {
                    // Scaling succeeded, use scaled cursor
                    cursor = HCURSOR(scaled_h.0);
                }
                // If scaling failed, use the fallback-sized cursor as-is
                break;
            }
        }
    }

    if cursor.is_invalid() {
        eprintln!("LoadImageW failed for {file_path} at size {size}");
        return false;
    }

    // Apply the cursor to the system
    let result = SetSystemCursor(cursor, SYSTEM_CURSOR_ID(cursor_id));

    if result.is_err() {
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
