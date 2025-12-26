use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;

use serde::{Deserialize, Serialize};
use zip::write::FileOptions;
use zip::{ZipArchive, ZipWriter};

use crate::state::CustomizationMode;

use super::library::LibraryPackItem;

pub const PACK_MANIFEST_FILENAME: &str = "cursor-pack.json";
const MANIFEST_VERSION: u32 = 1;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CursorPackManifest {
    pub version: u32,
    pub pack_name: String,
    pub mode: CustomizationMode,
    pub created_at: String,
    pub items: Vec<LibraryPackItem>,
}

impl CursorPackManifest {
    pub fn new(
        pack_name: String,
        mode: CustomizationMode,
        created_at: String,
        items: Vec<LibraryPackItem>,
    ) -> Self {
        Self {
            version: MANIFEST_VERSION,
            pack_name,
            mode,
            created_at,
            items,
        }
    }
}

pub fn write_manifest_entry<W: std::io::Seek + Write>(
    writer: &mut ZipWriter<W>,
    manifest: &CursorPackManifest,
    options: FileOptions<'_, ()>,
) -> Result<(), String> {
    let manifest_json =
        serde_json::to_vec_pretty(manifest).map_err(|e| format!("Failed to encode manifest: {e}"))?;
    writer
        .start_file(PACK_MANIFEST_FILENAME, options)
        .map_err(|e| format!("Failed to start manifest entry: {e}"))?;
    writer
        .write_all(&manifest_json)
        .map_err(|e| format!("Failed to write manifest: {e}"))
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
