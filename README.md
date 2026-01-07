# Cursor Changer

**Cursor Changer** is a simple and powerful tool for Windows that allows you to customize your mouse cursor with any image.

Easily change your Windows cursor or create a custom one from any image. No technical skills required—just add your image, and you are ready to go!

## 📚 Table of Contents

- [Features](#features)
- [Download & Installation](#download)
- [Changelog](#changelog)
- [For Developers](#for-developers)
    - [Tech Stack](#tech-stack)
    - [Important Commands](#important-commands)
        - [Run in Development Mode](#run-in-development-mode)
        - [Build for Production](#build-for-production)

<a id="features"></a>
## ✨ Features

-   **🖱️ Full Cursor Control**: Change your Windows cursor theme in seconds, with easy access to customize all 15 pointer styles the OS supports.
-   **🪄 Instant Cursor Creation**: Automatically turn any image (PNG, JPG/.JPEG, SVG, ICO, or BMP) into a functional cursor at the maximum 256×256 resolution with full alpha transparency—no external tools needed.
-   **📂 Personal Library**: Store and organize all your custom cursors in one convenient location.
-   **📦 Cursor Packs**: Effortlessly create, export, and import cursor collections. Share your custom sets with others or backup your library in a single file.
-   **🎯 Precise Accuracy**: Easily adjust your cursor’s click point (cursor hotspot) for perfect control.
-   **🍏 Mac Cursor Pack**: Swap Windows defaults for a full macOS-style cursor set instantly (Available as a ready-to-use cursor pack).
-   **🚀 Performance Focused**: Runs efficiently in the background without slowing down your computer.
-   **⚡ Real-Time Updates**: Apply new cursors immediately without restarting your computer.
-   **⌨️ Quick Toggle**: Hide or show your cursor instantly with a keyboard shortcut (Default: `Ctrl` + `Shift` + `X`).
-   **📏 Adjustable Size**: Make cursors as tiny or as large as you'd like (up to 256 px)
-   **🛡️ One-Click Reset**: Revert to the default Windows cursor instantly at any time.
-   **🧼 Non-Intrusive by Design**: When Cursor Changer closes, it automatically restores Windows' default cursor theme, leaving no trace.

<a id="download"></a>
## 📥 Download & Installation (v1.0.0)

To start using Cursor Changer on Windows:

1.  **Download the latest installer**: [Cursor.Changer_1.0.0_x64-setup.exe](https://github.com/dave-ying/cursor-changer/releases/download/v1.0.0/Cursor.Changer_1.0.0_x64-setup.exe)
2.  **Run the .exe file** and follow the on-screen instructions.
3.  **Launch the app** and start customizing your cursors!

You can also find all releases on the [GitHub Releases](https://github.com/dave-ying/cursor-changer/releases) page.

<a id="changelog"></a>
## 📄 Changelog

See the full [CHANGELOG.md](CHANGELOG.md) document for release details, fixes, and improvements.

---

<div align="center">

### 🧑‍💻 — Developer Zone Below —

</div>

---

<a id="for-developers"></a>
# For Developers

This section is for developers interested in the technology behind Cursor Changer.

<a id="tech-stack"></a>
## 🛠️ Tech Stack

This project is built using a modern, high-performance stack:

*   **Core**: [Rust](https://www.rust-lang.org/) ([Tauri framework](https://github.com/tauri-apps/tauri)) - Provides native performance and system integration.
*   **Frontend**: [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) - Handles the UI and logic.
*   **Build Tool**: [Vite](https://vitejs.dev/) - fast build tool for the frontend.
*   **Styling**: [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework.
*   **State**: [Zustand](https://github.com/pmndrs/zustand) - Minimalist state management.

<a id="important-commands"></a>
## 💻 Important Commands

To work with this repository, you will need **Rust** and **Node.js** installed.

<a id="run-in-development-mode"></a>
### 1. Run in Development Mode
Starts the frontend dev server and the Tauri window with hot-reload enabled.
```bash
cargo tauri dev
```

<a id="build-for-production"></a>
### 2. Build for Production
Compiles the application and enables optimizations. This creates the installer (`.exe` / `.msi`) in `src-tauri/target/release/bundle/`.
```bash
cargo tauri build
```
