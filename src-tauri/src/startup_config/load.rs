use super::normalize;
use crate::state::config::load_persisted_config;
use crate::state::PersistedConfig;
use tauri::AppHandle;

pub fn load(app: &AppHandle) -> PersistedConfig {
    match load_persisted_config(app) {
        Ok(cfg) => normalize::normalize(cfg),
        Err(err) => {
            cc_error!("Failed to load persisted config: {err}");
            normalize::normalize(PersistedConfig::default())
        }
    }
}
