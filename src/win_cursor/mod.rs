mod api;
mod constants;
mod cursor_types;
mod defaults;
mod paths;
mod registry;
mod toggle;

#[cfg(test)]
mod testing;

pub use api::{
    apply_blank_system_cursors, apply_cursor_file_with_size, apply_cursor_from_file_with_size,
    refresh_cursor_settings, restore_system_cursors,
};

pub use cursor_types::{CursorType, CURSOR_TYPES};

pub use defaults::{
    find_cursor_file_in_dir, find_default_cursor_in_dir, get_default_cursor_base_name,
    get_default_cursor_file, get_windows_cursors_folder, CURSOR_EXTENSIONS,
    DEFAULT_CURSOR_BASE_NAMES, DEFAULT_CURSOR_FILES,
};

pub use toggle::{perform_toggle, toggle_action, SystemApi, ToggleAction};

#[cfg(test)]
pub(crate) use constants::{CURSOR_DIMENSION, CURSOR_IDS, CURSOR_PLANE_BYTES};

pub use registry::{
    clear_cursor_registry_entries, read_cursor_image_from_registry,
    restore_cursor_registry_entries, snapshot_cursor_registry_entries,
    write_cursor_image_to_registry,
};

#[cfg(test)]
pub use testing::{
    clear_refresh_cursor_settings_mock, set_refresh_cursor_settings_mock,
    set_test_cursor_registry_path,
};
