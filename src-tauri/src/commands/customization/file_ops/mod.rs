pub(crate) mod browsing;
/// File operations for cursor customization - modular structure
///
/// This module provides file operations for cursor customization, organized into
/// focused submodules for better maintainability and testability.
pub(crate) mod conversion;
pub(crate) mod hotspot_update;
pub(crate) mod library_integration;
pub(crate) mod preview;
pub(crate) mod reading;

#[cfg(test)]
mod tests;

// Re-export public API
pub use browsing::browse_cursor_file;
pub use conversion::{
    convert_image_bytes_to_cur, convert_image_bytes_to_cur_with_click_point, convert_image_to_cur,
    convert_image_to_cur_with_click_point,
};
pub use hotspot_update::update_library_cursor_click_point;
pub use library_integration::{
    add_uploaded_cursor_to_library, add_uploaded_image_with_click_point_to_library,
};
pub use preview::{get_cursor_with_click_point, render_cursor_image_preview};
pub use reading::{read_cursor_file_as_bytes, read_cursor_file_as_data_url};
