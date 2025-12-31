pub mod cursor_commands;
pub mod customization; // Refactored from customization_commands
pub mod effects_commands;
pub mod file_commands;
pub mod folder_watcher;
#[cfg(not(test))]
pub mod hotkey_commands;
pub mod mode_commands;
#[cfg(not(test))]
pub mod settings_commands;
pub mod shutdown;
#[cfg(not(test))]
pub mod theme_commands;
#[cfg(not(test))]
pub mod window_commands;

pub mod command_helpers;

#[cfg(not(test))]
pub mod registry;
