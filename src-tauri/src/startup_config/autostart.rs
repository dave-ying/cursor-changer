use tauri::AppHandle;

pub enum AutostartRepairResult {
    NoChange,
    DisabledInvalidEntry,
}

pub fn validate_and_repair(_app: &AppHandle, app_name: &str) -> AutostartRepairResult {
    match crate::startup::get_autostart_entry(app_name) {
        Ok(Some(val)) => {
            let exe_path = crate::startup::extract_exe_path(&val);
            if !std::path::Path::new(&exe_path).exists() {
                cc_warn!(
                    "[CursorChanger] Autostart entry points to missing exe: {}",
                    exe_path
                );
                if let Err(e) = crate::startup::set_autostart(false, app_name, None) {
                    cc_warn!(
                        "[CursorChanger] Failed to remove broken autostart entry: {}",
                        e
                    );
                }
                return AutostartRepairResult::DisabledInvalidEntry;
            }
            AutostartRepairResult::NoChange
        }
        Ok(None) => {
            if let Err(e) = crate::startup::set_autostart(true, app_name, None) {
                cc_warn!("[CursorChanger] Failed to create autostart entry: {}", e);
            }
            AutostartRepairResult::NoChange
        }
        Err(e) => {
            cc_warn!("[CursorChanger] Failed to inspect autostart entry: {}", e);
            AutostartRepairResult::NoChange
        }
    }
}
