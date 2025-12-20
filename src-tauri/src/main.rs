#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[macro_use]
mod logging;

mod cleanup_hooks;
mod commands;
mod events;
pub mod cursor_converter;
mod cursor_defaults;
mod paths;
mod shortcuts;
mod startup;
mod startup_config;
mod state;
mod system;
mod tests;
mod tray;
mod utils;
mod window;
mod window_events;
mod window_setup; // Extracted test modules

use commands::folder_watcher::FolderWatcherState;
use state::{AppState, MinimizePreference};

use std::sync::Mutex;

fn main() {
    let builder = tauri::Builder::default()
        .manage(AppState::default())
        .manage(MinimizePreference::default())
        .manage(Mutex::new(FolderWatcherState::default()))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| Ok(startup::setup_app(app)?))
        .on_window_event(|window, event| window_events::on_window_event(window, event));

    let builder = commands::registry::register(builder);

    builder.run(tauri::generate_context!()).unwrap_or_else(|e| {
        cc_error!("Fatal error running Tauri application: {}", e);
        // Call cleanup before exiting on error
        // Note: In error case, we can't get the app handle, so just try basic cleanup
        let _ = std::thread::spawn(move || {
            // Basic cleanup without app handle
            let _ = crate::system::restore_system_cursors();
        });
        std::process::exit(1);
    });
}
