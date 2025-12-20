use winreg::RegKey;

use super::cursor_types::{CursorType, CURSOR_TYPES};

fn cursor_registry_subkey() -> String {
    #[cfg(test)]
    {
        if let Some(lock) = super::testing::TEST_CURSOR_REGISTRY_PATH.get() {
            let value = lock.lock().expect("test registry mutex poisoned").clone();
            if let Some(path) = value {
                return path;
            }
        }
    }

    "Control Panel\\Cursors".to_string()
}

/// Read a cursor image path from the Windows Registry for a specific cursor type.
/// Returns the file path string, or None if not found.
pub fn read_cursor_image_from_registry(cursor_type: &CursorType) -> Option<String> {
    let hkcu = RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let cursors = hkcu.open_subkey(cursor_registry_subkey()).ok()?;
    cursors.get_value(cursor_type.registry_key).ok()
}

/// Write a cursor image path to the Windows Registry for a specific cursor type.
/// Returns true on success. Automatically refreshes cursor settings
/// to apply the change immediately.
pub fn write_cursor_image_to_registry(cursor_type: &CursorType, image_path: &str) -> bool {
    use winreg::enums::KEY_WRITE;
    let hkcu = RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let cursors = match hkcu.open_subkey_with_flags(cursor_registry_subkey(), KEY_WRITE) {
        Ok(key) => key,
        Err(e) => {
            eprintln!("Failed to open registry key for writing: {e:?}");
            return false;
        }
    };

    let write_success = cursors
        .set_value(cursor_type.registry_key, &image_path)
        .is_ok();

    if write_success {
        // Notify Windows to refresh cursor settings to apply the change immediately
        unsafe {
            let _ = super::api::refresh_cursor_settings();
        }
        true
    } else {
        eprintln!(
            "Failed to write registry value for {}",
            cursor_type.registry_key
        );
        false
    }
}

/// Clear all cursor registry entries to reset to Windows system defaults.
/// This sets all cursor registry values to empty strings, which tells Windows
/// to use its built-in default cursors.
///
/// # Returns
/// `true` if successful, `false` if the registry could not be opened
pub fn clear_cursor_registry_entries() -> bool {
    use winreg::enums::KEY_WRITE;
    let hkcu = RegKey::predef(winreg::enums::HKEY_CURRENT_USER);

    match hkcu.open_subkey_with_flags(cursor_registry_subkey(), KEY_WRITE) {
        Ok(cursors_key) => {
            for cursor_type in &CURSOR_TYPES {
                // Set to empty string to reset to system default
                if let Err(e) = cursors_key.set_value(cursor_type.registry_key, &"") {
                    eprintln!(
                        "Warning: Failed to clear registry value for {}: {:?}",
                        cursor_type.registry_key, e
                    );
                }
            }
            true
        }
        Err(e) => {
            eprintln!("Failed to open registry key for writing: {e:?}");
            false
        }
    }
}

#[must_use]
pub fn snapshot_cursor_registry_entries() -> std::collections::HashMap<String, Option<String>> {
    let mut snapshot = std::collections::HashMap::new();

    let hkcu = RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let cursors = match hkcu.open_subkey(cursor_registry_subkey()) {
        Ok(key) => key,
        Err(e) => {
            eprintln!("Failed to open registry key for reading: {e:?}");
            return snapshot;
        }
    };

    for cursor_type in &CURSOR_TYPES {
        let value: Result<String, _> = cursors.get_value(cursor_type.registry_key);
        snapshot.insert(cursor_type.registry_key.to_string(), value.ok());
    }

    snapshot
}

#[must_use]
pub fn restore_cursor_registry_entries(
    snapshot: &std::collections::HashMap<String, Option<String>>,
) -> bool {
    use winreg::enums::KEY_WRITE;

    let hkcu = RegKey::predef(winreg::enums::HKEY_CURRENT_USER);
    let cursors_key = match hkcu.open_subkey_with_flags(cursor_registry_subkey(), KEY_WRITE) {
        Ok(key) => key,
        Err(e) => {
            eprintln!("Failed to open registry key for writing: {e:?}");
            return false;
        }
    };

    let mut success = true;
    for cursor_type in &CURSOR_TYPES {
        match snapshot.get(cursor_type.registry_key) {
            Some(Some(value)) => {
                if let Err(e) = cursors_key.set_value(cursor_type.registry_key, value) {
                    eprintln!(
                        "Warning: Failed to restore registry value for {}: {:?}",
                        cursor_type.registry_key, e
                    );
                    success = false;
                }
            }
            Some(None) => {
                let _ = cursors_key.delete_value(cursor_type.registry_key);
            }
            None => {}
        }
    }

    success
}
