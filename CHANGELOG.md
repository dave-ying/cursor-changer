# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - In progress
### Added
- Library management and interface controls for cursor collections.
- Info view entry point plus in-app About / Support details with links and branding assets.
- Default cursor style controls surfaced in the active panel for quicker tweaks.
- Unit tests covering CursorCustomization, HotspotPicker, and context providers.

### Changed
- Kept the main window visible during operations to avoid accidental hides.

## [1.0.0] - Initial release
### Added
- Windows desktop app built with Rust (Tauri), React, and TypeScript.
- Image-to-cursor conversion for PNG/JPG with crisp rendering on 4K displays.
- Personal cursor library with adjustable hotspot and size controls.
- Real-time cursor application and one-click reset to system defaults.
- Keyboard shortcut (Ctrl + Shift + X) to toggle the custom cursor.
