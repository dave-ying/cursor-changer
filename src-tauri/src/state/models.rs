use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub enum CustomizationMode {
    Simple,
    Advanced,
}

impl CustomizationMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Simple => "simple",
            Self::Advanced => "advanced",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.trim().to_lowercase().as_str() {
            "simple" => Some(Self::Simple),
            "advanced" => Some(Self::Advanced),
            _ => None,
        }
    }
}

impl Default for CustomizationMode {
    fn default() -> Self {
        Self::Simple
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub enum ThemeMode {
    Light,
    Dark,
    System,
}

impl ThemeMode {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Light => "light",
            Self::Dark => "dark",
            Self::System => "system",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.trim().to_lowercase().as_str() {
            "light" => Some(Self::Light),
            "dark" => Some(Self::Dark),
            "system" => Some(Self::System),
            _ => None,
        }
    }
}

impl Default for ThemeMode {
    fn default() -> Self {
        Self::Dark
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
#[ts(export, export_to = "../../frontend-vite/src/types/generated/")]
pub enum DefaultCursorStyle {
    Windows,
}

impl DefaultCursorStyle {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Windows => "windows",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.trim().to_lowercase().as_str() {
            "windows" => Some(Self::Windows),
            _ => None,
        }
    }
}

impl Default for DefaultCursorStyle {
    fn default() -> Self {
        Self::Windows
    }
}
