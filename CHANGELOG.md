# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - Patch release
### Fixed
- Fixed bug where cursor preview would not display images when creating cursors from image files
- Implemented ANI preview caching and file path resolution for better performance

### Added
- Microsoft Store installation option with download badges
- MSIX package compatibility for better Windows Store distribution
- Reference cursor assets for Windows and macOS platforms
- Backend data URL conversion to handle MSIX sandbox restrictions

## [1.0.0] - Initial release
### Added
- Windows desktop app built with Rust (Tauri), React, and TypeScript.
- Image-to-cursor conversion for PNG/JPG with crisp rendering on 4K displays.
- Personal cursor library with adjustable hotspot and size controls.
- Real-time cursor application and one-click reset to system defaults.
- Keyboard shortcut (Ctrl + Shift + X) to toggle the custom cursor.
