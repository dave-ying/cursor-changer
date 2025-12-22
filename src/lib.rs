//! Library helpers extracted from `src/main.rs`.
//!
//! This crate exposes low-level cursor manipulation helpers so other
//! binaries (CLI) and a future Tauri backend can call them.

#![allow(non_upper_case_globals)]

mod win_common;
pub mod win_cursor;
pub mod win_runtime;

pub use win_common::{build_tip_buffer, copy_tip_to_buf, to_wide};
pub use win_cursor::{
    apply_blank_system_cursors, apply_cursor_file_with_size, apply_cursor_from_file_with_size,
    clear_cursor_registry_entries, find_cursor_file_in_dir, find_default_cursor_in_dir,
    get_default_cursor_base_name, get_windows_cursors_folder,
    perform_toggle, read_cursor_image_from_registry, refresh_cursor_settings,
    restore_cursor_registry_entries, restore_system_cursors, snapshot_cursor_registry_entries,
    toggle_action, write_cursor_image_to_registry, CursorType, SystemApi, ToggleAction,
    CURSOR_EXTENSIONS, CURSOR_TYPES, DEFAULT_CURSOR_BASE_NAMES,
};

pub use win_runtime::run_app;

