# Cursor Changer

**Cursor Changer** is a simple and powerful tool for Windows that allows you to customize your mouse cursor with any image.

Instead of navigating through complex system settings, use Cursor Changer to personalize your desktop experience in seconds.

> 📄 See the full [Changelog](CHANGELOG.md).

## ✨ Features

-   **🖼️ Instant Conversion**: Automatically turn any image (PNG or JPG) into a functional cursor. No external tools needed.
-   **💎 High Definition**: Cursors appear crisp and sharp on all screens, including 4K displays.
-   **📂 Personal Library**: Store and organize all your custom cursors in one convenient location.
-   **🎯 Precise Accuracy**: Easily adjust the exact "click point" of your cursor for perfect control.
-   **🚀 Performance Focused**: Runs efficiently in the background without slowing down your computer.
-   **🎨 Modern Interface**: Enjoy a sleek, dark-themed design that fits your modern workflow.
-   **⚡ Real-Time Updates**: Apply new cursors immediately without restarting your computer.
-   **⌨️ Quick Toggle**: Switch your custom cursor on or off instantly with a keyboard shortcut (Default: `Ctrl` + `Shift` + `X`).
-   **📏 Adjustable Size**: Scale your cursor to be as large or small as you need.
-   **🛡️ One-Click Reset**: Revert to the default Windows cursor instantly at any time.

---

# For Developers

This section is for developers interested in the technology behind Cursor Changer.

## 🛠️ Tech Stack

This project is built using a modern, high-performance stack:

*   **Core**: [Rust](https://www.rust-lang.org/) ([Tauri framework](https://github.com/tauri-apps/tauri)) - Provides native performance and system integration.
*   **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) - Handles the UI and logic.
*   **Build Tool**: [Vite](https://vitejs.dev/) - fast build tool for the frontend.
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework.
*   **State**: [Zustand](https://github.com/pmndrs/zustand) - Minimalist state management.

## 💻 Important Commands

To work with this repository, you will need **Rust** and **Node.js** installed.

### 1. Run in Development Mode
Starts the frontend dev server and the Tauri window with hot-reload enabled.
```bash
cargo tauri dev
```

### 2. Build for Production
Compiles the application and enables optimizations. This creates the installer (`.exe` / `.msi`) in `src-tauri/target/release/bundle/`.
```bash
cargo tauri build
```

### Updater toggle by build target
- NSIS installer (self-update): leave default behavior. Updater plugin is enabled unless `CC_ENABLE_TAURI_UPDATER=0`.
- MSI → MSIX for Microsoft Store: disable updater so the store handles updates:
  - Set environment variable `CC_ENABLE_TAURI_UPDATER=0` (also ensure frontend env `VITE_ENABLE_TAURI_UPDATER=0` so the “Check for updates” UI stays hidden).
  - Build MSI/MSIX with that env set; updater plugin and UI will be off in the packaged app.
