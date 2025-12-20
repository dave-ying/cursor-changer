use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(ts_rs::TS, Serialize, Deserialize, Debug, Clone)]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub struct EffectsConfig {
    pub enabled: Vec<String>,
}

/// Get the path to the effects config file
fn get_effects_config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Ensure the directory exists
    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_data_dir.join("effects.json"))
}

/// Save effects configuration to disk
#[tauri::command]
pub fn save_effects_config(app: AppHandle, config: EffectsConfig) -> Result<(), String> {
    let config_path = get_effects_config_path(&app)?;

    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, json).map_err(|e| format!("Failed to write config file: {}", e))?;

    Ok(())
}

/// Load effects configuration from disk
#[tauri::command]
pub fn load_effects_config(app: AppHandle) -> Result<EffectsConfig, String> {
    let config_path = get_effects_config_path(&app)?;

    // Return default config if file doesn't exist
    if !config_path.exists() {
        return Ok(EffectsConfig {
            enabled: Vec::new(),
        });
    }

    let json = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;

    let config: EffectsConfig =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse config file: {}", e))?;

    Ok(config)
}
