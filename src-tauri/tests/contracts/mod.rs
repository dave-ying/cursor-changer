/// Command Parameter Contract Tests Module
/// 
/// This module contains contract tests for Tauri command parameters.
/// The contracts are organized by command category for better maintainability.
/// 
/// **Validates: Requirements 9.2**

mod types;
mod cursor_contracts;
mod library_contracts;
mod file_contracts;
mod cursor_setting_contracts;
mod theme_mode_contracts;
mod window_contracts;
mod validation_tests;

pub use types::{ParameterSchema, CommandContract};
pub use cursor_contracts::get_cursor_contracts;
pub use library_contracts::get_library_contracts;
pub use file_contracts::get_file_contracts;
pub use cursor_setting_contracts::get_cursor_setting_contracts;
pub use theme_mode_contracts::get_theme_mode_contracts;
pub use window_contracts::get_window_contracts;

use std::collections::HashMap;

/// Get all command contracts by combining all categories
pub fn get_command_contracts() -> HashMap<String, CommandContract> {
    let mut contracts = HashMap::new();
    
    // Merge all contract categories
    contracts.extend(get_cursor_contracts());
    contracts.extend(get_library_contracts());
    contracts.extend(get_file_contracts());
    contracts.extend(get_cursor_setting_contracts());
    contracts.extend(get_theme_mode_contracts());
    contracts.extend(get_window_contracts());
    
    contracts
}
