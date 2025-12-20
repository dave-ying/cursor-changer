pub mod app_state;
pub mod config;
pub mod models;
pub mod types;

pub use app_state::{AppState, CursorInfo, MinimizePreference};
pub use config::PersistedConfig;
pub use models::{CustomizationMode, DefaultCursorStyle, ThemeMode};
pub use types::CursorStatePayload;
