//! Library interface for cursor_changer_tauri
//!
//! This module exposes the cursor converter functionality for integration tests.

#[macro_use]
mod logging;

// Include the cursor_converter module from main.rs
#[path = "cursor_converter/mod.rs"]
pub mod cursor_converter;

#[path = "paths.rs"]
pub mod paths;

#[path = "cursor_defaults.rs"]
pub mod cursor_defaults;

// Include the state module for testing
#[path = "state/mod.rs"]
pub mod state;

// Include the commands module for testing
#[path = "commands/mod.rs"]
pub mod commands;

// Include startup-time helpers referenced by startup.rs
#[path = "cleanup_hooks.rs"]
pub mod cleanup_hooks;

#[path = "tray.rs"]
pub mod tray;

#[path = "window_setup.rs"]
pub mod window_setup;

// Include system module for commands
#[path = "system.rs"]
pub mod system;

// Include shortcuts module for commands
#[path = "shortcuts.rs"]
pub mod shortcuts;

// Include startup module for commands
#[path = "startup.rs"]
pub mod startup;

// Include startup_config module for commands
#[path = "startup_config/mod.rs"]
pub mod startup_config;

#[path = "window_events.rs"]
pub mod window_events;

// Include window module for commands
#[path = "window/mod.rs"]
pub mod window;

// Include utils module for commands
#[path = "utils/mod.rs"]
pub mod utils;

// Centralized event name constants
#[path = "events.rs"]
pub mod events;
