#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(e) = cursor_changer::run_app() {
        eprintln!("Application error: {e}");
        std::process::exit(1);
    }
}
