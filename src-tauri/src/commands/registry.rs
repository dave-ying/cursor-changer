macro_rules! cursor_commands {
    () => {
        crate::commands::cursor_commands::get_status,
        crate::commands::cursor_commands::toggle_cursor,
        crate::commands::cursor_commands::restore_cursor,
    };
}

macro_rules! hotkey_commands {
    () => {
        crate::commands::hotkey_commands::set_hotkey,
        crate::commands::hotkey_commands::set_hotkey_temporarily_enabled,
        crate::commands::hotkey_commands::set_shortcut_enabled,
    };
}

macro_rules! window_commands {
    () => {
        crate::commands::window_commands::set_minimize_to_tray,
        crate::commands::window_commands::set_run_on_startup,
        crate::commands::window_commands::set_accent_color,
        crate::commands::window_commands::reset_all_settings,
        crate::commands::window_commands::reset_window_size_to_default,
        crate::commands::window_commands::set_default_cursor_style,
        crate::commands::window_commands::quit_app,
    };
}

macro_rules! theme_commands {
    () => {
        crate::commands::theme_commands::set_theme_mode,
        crate::commands::theme_commands::get_theme_mode,
    };
}

macro_rules! mode_commands {
    () => {
        crate::commands::mode_commands::switch_customization_mode,
        crate::commands::mode_commands::get_customization_mode,
    };
}

macro_rules! file_commands {
    () => {
        crate::commands::file_commands::save_cursor_file,
        crate::commands::file_commands::save_temp_cursor_file,
        crate::commands::file_commands::save_cursor_to_appdata,
        crate::commands::file_commands::get_library_cursors_folder,
        crate::commands::file_commands::show_library_cursors_folder,
    };
}

macro_rules! effects_commands {
    () => {
        crate::commands::effects_commands::save_effects_config,
        crate::commands::effects_commands::load_effects_config,
    };
}

macro_rules! folder_watcher_commands {
    () => {
        crate::commands::folder_watcher::start_library_folder_watcher,
        crate::commands::folder_watcher::stop_library_folder_watcher,
        crate::commands::folder_watcher::sync_library_with_folder,
    };
}

macro_rules! customization_query_commands {
    () => {
        crate::commands::customization::query::get_available_cursors,
        crate::commands::customization::query::get_custom_cursors,
        crate::commands::customization::query::get_cursor_image,
        crate::commands::customization::query::get_system_cursor_preview,
    };
}

macro_rules! customization_file_ops_commands {
    () => {
        crate::commands::customization::file_ops::browsing::browse_cursor_file,
        crate::commands::customization::file_ops::preview::get_cursor_with_click_point,
        crate::commands::customization::file_ops::preview::render_cursor_image_preview,
        crate::commands::customization::file_ops::reading::read_cursor_file_as_data_url,
        crate::commands::customization::file_ops::reading::read_cursor_file_as_bytes,
        crate::commands::customization::file_ops::conversion::convert_image_to_cur_with_click_point,
        crate::commands::customization::file_ops::library_integration::add_uploaded_cursor_to_library,
        crate::commands::customization::file_ops::library_integration::add_uploaded_image_with_click_point_to_library,
        crate::commands::customization::file_ops::hotspot_update::update_library_cursor_click_point,
    };
}

macro_rules! customization_set_commands {
    () => {
        crate::commands::customization::set_cursor_core::set_cursor_image,
        crate::commands::customization::set_cursor_bulk::set_all_cursors,
        crate::commands::customization::set_cursor_bulk::set_all_cursors_with_size,
        crate::commands::customization::set_cursor_bulk::set_single_cursor_with_size,
        crate::commands::customization::set_cursor_bulk::set_multiple_cursors_with_size,
        crate::commands::customization::set_cursor_size::set_cursor_size,
    };
}

macro_rules! customization_defaults_commands {
    () => {
        crate::commands::customization::defaults::set_cursors_to_windows_defaults,
        crate::commands::customization::defaults::load_app_default_cursors,
        crate::commands::customization::defaults::reset_cursor_to_default,
        crate::commands::customization::defaults::reset_current_mode_cursors,
        crate::commands::customization::defaults::delete_custom_cursor,
    };
}

macro_rules! customization_library_commands {
    () => {
        crate::commands::customization::library::get_library_cursors,
        crate::commands::customization::library::reorder_library_cursors,
        crate::commands::customization::library::export_library_cursors,
        crate::commands::customization::library::add_cursor_to_library,
        crate::commands::customization::library::update_cursor_in_library,
        crate::commands::customization::library::remove_cursor_from_library,
        crate::commands::customization::library::rename_cursor_in_library,
        crate::commands::customization::library::get_library_cursor_preview,
        crate::commands::customization::library::get_ani_preview_data,
        crate::commands::customization::library::reset_library,
    };
}

macro_rules! all_commands {
    () => {
        cursor_commands!()
        hotkey_commands!()
        window_commands!()
        theme_commands!()
        mode_commands!()
        file_commands!()
        effects_commands!()
        folder_watcher_commands!()
        customization_query_commands!()
        customization_file_ops_commands!()
        customization_set_commands!()
        customization_defaults_commands!()
        customization_library_commands!()
    };
}

pub fn register(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.invoke_handler(tauri::generate_handler![
        crate::commands::cursor_commands::get_status,
        crate::commands::cursor_commands::toggle_cursor,
        crate::commands::cursor_commands::restore_cursor,
        crate::commands::hotkey_commands::set_hotkey,
        crate::commands::hotkey_commands::set_hotkey_temporarily_enabled,
        crate::commands::hotkey_commands::set_shortcut_enabled,
        crate::commands::window_commands::set_minimize_to_tray,
        crate::commands::window_commands::set_run_on_startup,
        crate::commands::window_commands::set_accent_color,
        crate::commands::window_commands::reset_all_settings,
        crate::commands::window_commands::reset_window_size_to_default,
        crate::commands::window_commands::set_default_cursor_style,
        crate::commands::window_commands::quit_app,
        crate::commands::theme_commands::set_theme_mode,
        crate::commands::theme_commands::get_theme_mode,
        crate::commands::mode_commands::switch_customization_mode,
        crate::commands::mode_commands::get_customization_mode,
        crate::commands::file_commands::save_cursor_file,
        crate::commands::file_commands::save_temp_cursor_file,
        crate::commands::file_commands::save_cursor_to_appdata,
        crate::commands::file_commands::get_library_cursors_folder,
        crate::commands::file_commands::show_library_cursors_folder,
        crate::commands::effects_commands::save_effects_config,
        crate::commands::effects_commands::load_effects_config,
        crate::commands::folder_watcher::start_library_folder_watcher,
        crate::commands::folder_watcher::stop_library_folder_watcher,
        crate::commands::folder_watcher::sync_library_with_folder,
        crate::commands::customization::query::get_available_cursors,
        crate::commands::customization::query::get_custom_cursors,
        crate::commands::customization::query::get_cursor_image,
        crate::commands::customization::query::get_system_cursor_preview,
        crate::commands::customization::file_ops::browsing::browse_cursor_file,
        crate::commands::customization::file_ops::preview::get_cursor_with_click_point,
        crate::commands::customization::file_ops::preview::render_cursor_image_preview,
        crate::commands::customization::file_ops::reading::read_cursor_file_as_data_url,
        crate::commands::customization::file_ops::reading::read_cursor_file_as_bytes,
        crate::commands::customization::file_ops::conversion::convert_image_to_cur_with_click_point,
        crate::commands::customization::file_ops::library_integration::add_uploaded_cursor_to_library,
        crate::commands::customization::file_ops::library_integration::add_uploaded_image_with_click_point_to_library,
        crate::commands::customization::file_ops::hotspot_update::update_library_cursor_click_point,
        crate::commands::customization::set_cursor_core::set_cursor_image,
        crate::commands::customization::set_cursor_bulk::set_all_cursors,
        crate::commands::customization::set_cursor_bulk::set_all_cursors_with_size,
        crate::commands::customization::set_cursor_bulk::set_single_cursor_with_size,
        crate::commands::customization::set_cursor_bulk::set_multiple_cursors_with_size,
        crate::commands::customization::set_cursor_size::set_cursor_size,
        crate::commands::customization::defaults::set_cursors_to_windows_defaults,
        crate::commands::customization::defaults::load_app_default_cursors,
        crate::commands::customization::defaults::reset_cursor_to_default,
        crate::commands::customization::defaults::reset_current_mode_cursors,
        crate::commands::customization::defaults::delete_custom_cursor,
        crate::commands::customization::library::get_library_cursors,
        crate::commands::customization::library::reorder_library_cursors,
        crate::commands::customization::library::export_library_cursors,
        crate::commands::customization::library::add_cursor_to_library,
        crate::commands::customization::library::update_cursor_in_library,
        crate::commands::customization::library::remove_cursor_from_library,
        crate::commands::customization::library::rename_cursor_in_library,
        crate::commands::customization::library::get_library_cursor_preview,
        crate::commands::customization::library::get_ani_preview_data,
        crate::commands::customization::library::reset_library,
    ])
}
