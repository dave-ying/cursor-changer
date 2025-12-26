/// Standalone binary to generate TypeScript types from Rust types
/// Run with: cargo run --bin generate_types
///
/// This uses ts-rs to generate TypeScript type definitions
/// from Rust structs that are used in Tauri commands.
///
/// **Validates: Requirements 9.1**
use ts_rs::TS;

// Import types from the library crate
use cursor_changer_tauri::commands::customization::library::{
    AniPreviewData, LibraryCursor, LibraryPackItem, LibraryPackMetadata,
};
use cursor_changer_tauri::state::app_state::CursorInfo;
use cursor_changer_tauri::state::types::{CursorClickPointInfo, CursorStatePayload};
use cursor_changer_tauri::state::{CustomizationMode, DefaultCursorStyle, ThemeMode};

fn main() {
    println!("Generating TypeScript types...");

    // Export all types - this triggers ts-rs to generate .ts files
    CursorStatePayload::export().expect("Failed to export CursorStatePayload");
    println!("✓ Generated CursorStatePayload.ts");

    CursorClickPointInfo::export().expect("Failed to export CursorClickPointInfo");
    println!("✓ Generated CursorClickPointInfo.ts");

    CursorInfo::export().expect("Failed to export CursorInfo");
    println!("✓ Generated CursorInfo.ts");

    ThemeMode::export().expect("Failed to export ThemeMode");
    println!("✓ Generated ThemeMode.ts");

    DefaultCursorStyle::export().expect("Failed to export DefaultCursorStyle");
    println!("✓ Generated DefaultCursorStyle.ts");

    CustomizationMode::export().expect("Failed to export CustomizationMode");
    println!("✓ Generated CustomizationMode.ts");

    LibraryCursor::export().expect("Failed to export LibraryCursor");
    println!("✓ Generated LibraryCursor.ts");
    LibraryPackMetadata::export().expect("Failed to export LibraryPackMetadata");
    println!("✓ Generated LibraryPackMetadata.ts");
    LibraryPackItem::export().expect("Failed to export LibraryPackItem");
    println!("✓ Generated LibraryPackItem.ts");
    AniPreviewData::export().expect("Failed to export AniPreviewData");
    println!("✓ Generated AniPreviewData.ts");

    println!("\n✅ All TypeScript types generated successfully!");
    println!("Location: frontend-vite/src/types/generated/");
}
