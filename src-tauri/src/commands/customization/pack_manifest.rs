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




