mod gif;
mod parser;
mod preview;
mod render;

use std::fmt;

use super::AniPreviewData;

#[derive(Debug)]
pub(super) enum AniError {
    InvalidFormat(&'static str),
    NoFrames,
    ImageDecode(String),
    ImageEncode(String),
}

impl fmt::Display for AniError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AniError::InvalidFormat(msg) => write!(f, "{}", msg),
            AniError::NoFrames => write!(f, "ANI file has no frames"),
            AniError::ImageDecode(msg) => write!(f, "{}", msg),
            AniError::ImageEncode(msg) => write!(f, "{}", msg),
        }
    }
}

impl std::error::Error for AniError {}

pub(super) async fn get_ani_preview_data(file_path: String) -> Result<AniPreviewData, String> {
    preview::get_ani_preview_data(file_path).await
}

pub(super) use parser::AniData;

#[allow(dead_code)]
pub(super) fn parse_ani_file(data: &[u8]) -> Option<AniData> {
    parser::parse_ani_file(data).ok()
}

pub(super) fn extract_ani_first_frame(data: &[u8]) -> Option<Vec<u8>> {
    parser::extract_ani_first_frame(data)
}

pub(super) fn convert_ani_to_gif(data: &[u8]) -> Option<Vec<u8>> {
    gif::convert_ani_to_gif(data)
}
