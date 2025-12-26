use std::fs::File;
use std::io::Read;
use std::path::Path;

use serde::{Deserialize, Serialize};
use zip::ZipArchive;

use crate::state::CustomizationMode;

use super::library::LibraryPackItem;

pub const PACK_MANIFEST_FILENAME: &str = "cursor-pack.json";

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CursorPackManifest {
    pub version: u32,
    pub pack_name: String,
    pub mode: CustomizationMode,
    pub created_at: String,
    pub items: Vec<LibraryPackItem>,
}

pub fn read_manifest_from_archive<R: Read + std::io::Seek>(
    archive: &mut ZipArchive<R>,
) -> Result<CursorPackManifest, String> {
    let mut file = archive
        .by_name(PACK_MANIFEST_FILENAME)
        .map_err(|_| "Cursor pack is missing manifest file".to_string())?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)
        .map_err(|e| format!("Failed to read manifest: {e}"))?;
    serde_json::from_str(&contents).map_err(|e| format!("Failed to parse manifest: {e}"))
}

pub fn read_manifest_from_path(path: &Path) -> Result<CursorPackManifest, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open pack archive: {e}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read archive contents: {e}"))?;
    read_manifest_from_archive(&mut archive)
}
