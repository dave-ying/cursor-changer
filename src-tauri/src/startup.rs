use tauri::Manager;

use crate::state::{AppState, MinimizePreference};

#[cfg(target_os = "windows")]
mod windows {
    use std::env;
    use std::path::Path;
    use winreg::enums::*;
    use winreg::RegKey;
    // Optional WinRT / MSIX support (only enabled when built with feature `msix`)
    #[cfg(feature = "msix")]
    use windows::ApplicationModel::Package;
    // We need a small sync bridge to wait for WinRT async operations. The
    // `windows` crate exposes IAsyncOperation which implements Future via the
    // `windows-future` support; use the futures executor to block on it.
    // No synchronous helper available here; the WinRT async APIs require a
    // minimal adapter to block on IAsyncOperation. For now we avoid pulling in
    // that adapter into this crate and instead return a clear error from the
    // action until a proper implementation is added.

    // Set or remove a Run entry in HKCU so the app launches on user login.
    pub fn set_autostart(enable: bool, name: &str, extra_args: Option<&str>) -> Result<(), String> {
        // If we're running packaged (MSIX / Store), use the StartupTask WinRT API instead of registry.
        // We'll try to detect packaging via Windows.ApplicationModel::Package::Current().
        if is_packaged() {
            // For MSIX we expect the TaskId declared in the AppxManifest to match this name.
            // Map the logical `name` to the TaskId used in the manifest. We chose "CursorChangerStartup".
            let task_id = "CursorChangerStartup";
            return set_msix_autostart(enable, task_id);
        }

        // Fallback: write to HKCU Run for unpackaged installs.
        // HKCU\Software\Microsoft\Windows\CurrentVersion\Run
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        let (run_key, _disp) = hkcu
            .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
            .map_err(|e| e.to_string())?;

        if enable {
            let exe = env::current_exe().map_err(|e| e.to_string())?;
            let mut cmd = format!("\"{}\"", exe.display());
            if let Some(args) = extra_args {
                if !args.is_empty() {
                    cmd.push(' ');
                    cmd.push_str(args);
                }
            }
            run_key.set_value(name, &cmd).map_err(|e| e.to_string())?;
        } else {
            // Ignore NotFound errors when attempting to delete
            match run_key.delete_value(name) {
                Ok(_) => {}
                Err(_e) => {
                    // Ignore errors when deleting (e.g. not found)
                }
            }
        }

        Ok(())
    }

    /// Rough check whether the current process is running as a packaged (MSIX/Appx) app.
    /// If built with `--features msix` this will attempt to use Package::Current(); otherwise
    /// it returns false so the normal registry path is used.
    #[cfg(feature = "msix")]
    pub fn is_packaged() -> bool {
        match Package::Current() {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    #[cfg(not(feature = "msix"))]
    pub fn is_packaged() -> bool {
        // MSIX/WinRT support not compiled in; treat as unpackaged.
        false
    }

    /// Enable or disable the MSIX StartupTask with the specified TaskId.
    /// When built with feature `msix` this invokes the WinRT API: StartupTask.GetForCurrentPackageAsync
    /// then RequestEnableAsync()/Disable(). When the feature is not present this returns an error.
    #[cfg(feature = "msix")]
    pub fn set_msix_autostart(_enable: bool, _task_id: &str) -> Result<(), String> {
        Err("MSIX StartupTask support not implemented for this build. Build without the `msix` feature or implement a WinRT async bridge to use StartupTask APIs.".to_string())
    }

    #[cfg(not(feature = "msix"))]
    pub fn set_msix_autostart(_enable: bool, _task_id: &str) -> Result<(), String> {
        Err("MSIX StartupTask support not compiled in (build with --features msix)".to_string())
    }

    /// Read the raw Run entry value for `name` if present.
    pub fn get_autostart_entry(name: &str) -> Result<Option<String>, String> {
        let hkcu = RegKey::predef(HKEY_CURRENT_USER);
        match hkcu.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run") {
            Ok(run_key) => match run_key.get_value::<String, &str>(name) {
                Ok(v) => Ok(Some(v)),
                Err(e) => {
                    if e.kind() == std::io::ErrorKind::NotFound {
                        Ok(None)
                    } else {
                        Err(e.to_string())
                    }
                }
            },
            Err(e) => {
                // Key missing or other error; treat as no entry if not found.
                if e.kind() == std::io::ErrorKind::NotFound {
                    Ok(None)
                } else {
                    Err(e.to_string())
                }
            }
        }
    }

    /// Extract the executable path portion from a Run entry value (handles quoted paths).
    pub fn extract_exe_path(value: &str) -> String {
        let s = value.trim();
        if s.starts_with('"') {
            // find the next quote
            if let Some(end) = s[1..].find('"') {
                return s[1..1 + end].to_string();
            }
        }

        // Not quoted: split on whitespace and take first token
        if let Some(pos) = s.find(char::is_whitespace) {
            return s[..pos].to_string();
        }

        s.to_string()
    }

    /// Helper to check whether the current Run entry for `name` points to an existing file.
    #[allow(dead_code)]
    pub fn autostart_entry_points_to_existing_file(name: &str) -> Result<Option<bool>, String> {
        match get_autostart_entry(name)? {
            Some(v) => {
                let path_str = extract_exe_path(&v);
                let path = Path::new(&path_str);
                Ok(Some(path.exists()))
            }
            None => Ok(None),
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod windows {
    // Stub for non-Windows platforms — no-op.
    pub fn set_autostart(
        _enable: bool,
        _name: &str,
        _extra_args: Option<&str>,
    ) -> Result<(), String> {
        Ok(())
    }

    pub fn get_autostart_entry(_name: &str) -> Result<Option<String>, String> {
        Ok(None)
    }

    pub fn extract_exe_path(value: &str) -> String {
        value.to_string()
    }

    #[allow(dead_code)]
    pub fn autostart_entry_points_to_existing_file(_name: &str) -> Result<Option<bool>, String> {
        Ok(None)
    }
}

pub use windows::{extract_exe_path, get_autostart_entry, set_autostart};

pub fn setup_app(app: &mut tauri::App) -> tauri::Result<()> {
    let app_handle = app.handle().clone();

    #[cfg(debug_assertions)]
    crate::cleanup_hooks::initialize_cleanup_hooks(&app_handle);

    crate::tray::build_tray(&app_handle)?;

    let state = app.state::<AppState>();
    let preference = app.state::<MinimizePreference>();

    if let Ok(restoration) = state.restoration.read() {
        if restoration.cursor_registry_snapshot.is_none() {
            drop(restoration);
            if let Ok(mut restoration) = state.restoration.write() {
                if restoration.cursor_registry_snapshot.is_none() {
                    restoration.cursor_registry_snapshot =
                        Some(cursor_changer::snapshot_cursor_registry_entries());
                }
            }
        }
    }

    let persisted_config =
        crate::startup_config::load_and_apply_config(&app_handle, &state, &preference);

    let shortcut_enabled = persisted_config.shortcut_enabled.unwrap_or(true);
    crate::shortcuts::initialize_shortcut(
        &app_handle,
        &state,
        persisted_config.shortcut,
        shortcut_enabled,
    );

    crate::window_setup::initialize_main_window(&app_handle);

    crate::startup_config::load_default_cursors(app_handle, state);

    Ok(())
}
