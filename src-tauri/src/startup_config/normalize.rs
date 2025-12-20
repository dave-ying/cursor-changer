use crate::state::config::normalize_persisted_config;
use crate::state::PersistedConfig;

pub fn normalize(config: PersistedConfig) -> PersistedConfig {
    normalize_persisted_config(config)
}
