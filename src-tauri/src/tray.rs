use crate::commands::window_commands::show_main_window;
use tauri::image::Image;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;
use tauri::Result;

/// Build and initialize the system tray icon with menu items.
///
/// Creates a tray icon with:
/// - "Show" menu item - brings the main window to the foreground
/// - "Quit" menu item - restores cursors and exits the application
/// - Left-click handler - shows the main window
///
/// # Arguments
/// * `app` - The Tauri application handle
///
/// # Returns
/// * `Ok(())` - Successfully created the tray icon
/// * `Err(tauri::Error)` - Failed to create menu items or tray icon
pub fn build_tray(app: &AppHandle) -> Result<()> {
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let icon_bytes = include_bytes!("../icons/icon.ico");
    let icon = Image::from_bytes(icon_bytes)?;

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "quit" => {
                let app_handle = app.clone();
                let _ = std::thread::spawn(move || {
                    crate::commands::shutdown::request_exit(app_handle);
                });
            }
            "show" => show_main_window(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}
