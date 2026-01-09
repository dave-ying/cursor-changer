<div align="center">

# 🌟 Cursor Changer

_A simple yet powerful Windows tool to customize your mouse cursor with any image._

</div>

<div align="center">

[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Release](https://img.shields.io/github/v/release/dave-ying/cursor-changer?style=flat-square)](https://github.com/dave-ying/cursor-changer/releases)
![Platform](https://img.shields.io/badge/Platform-Windows-blue?style=flat-square)
![GitHub Stars](https://img.shields.io/github/stars/dave-ying/cursor-changer?style=flat-square)
![GitHub Issues](https://img.shields.io/github/issues/dave-ying/cursor-changer?style=flat-square)

</div>

---

## ✨ Overview

**Cursor Changer** is a simple and powerful tool for Windows that allows you to customize your mouse cursor with any image.

Easily change your Windows cursor or create a custom one from any image. No technical skills required — just add your image, and you are ready to go!

---

## 🚀 Features

| Feature | Description |
|---------|-------------|
| 🖱️ **Full Cursor Control** | Change all 15 Windows cursor types |
| 🪄 **Instant Creation** | Turn any image into a cursor instantly |
| 📂 **Personal Library** | Store and organize custom cursors |
| 📦 **Cursor Packs** | Export and import cursor collections |
| 🎯 **Precise Hotspots** | Adjust click point accuracy |
| 🍎 **Mac Cursor Pack** | Ready-to-use macOS-style cursors |
| ⚡ **Performance** | Efficient background operation |
| 🔄 **Real-Time Updates** | Apply changes instantly |
| ⌨️ **Quick Toggle** | Hide/show cursor with shortcut (Ctrl+Shift+X) |
| 📏 **Adjustable Size** | Up to 256px |
| 🛡️ **One-Click Reset** | Restore defaults anytime |
| 🧼 **Non-Intrusive** | Auto-restores Windows cursors on close |

---

## 📥 Download & Installation

### Microsoft Store (Recommended)

<a href="https://apps.microsoft.com/store/detail/9NKWG9X10811?cid=github-readme">
  <img src="assets/badges/get-it-from-microsoft-store-dark.svg" alt="Get it from Microsoft Store" width="200"/>
</a>

### Direct Download

Or download the installer directly: **[Cursor.Changer_1.0.1_x64-setup.exe](https://github.com/dave-ying/cursor-changer/releases/download/v1.0.1/Cursor.Changer_1.0.1_x64-setup.exe)**

All releases are available on **[GitHub Releases](https://github.com/dave-ying/cursor-changer/releases)**.

---

## 📖 How to Use

## How to Add Custom Cursors

Add cursors to your library by uploading an image or a native cursor file:

### Method 1: Turn Any Image into a Cursor
Convert any image into a cursor at 256×256 max resolution with full alpha transparency. Supported formats: **PNG, JPG, SVG, ICO, BMP**.

1. Click **Add** in the Library section and select an image
2. Set the cursor click point (hotspot) by clicking on the preview image
3. Click **Save** to add to your Library

### Method 2: Import Native Cursor Files
Use existing cursor files directly without conversion. Supports **.cur** (static) and **.ani** (animated) files.

1. Click **Add** in the Library section
2. Select a cursor file (.cur for static, .ani for animated)
3. The cursor is added directly to your Library

### Changing Cursors

1. Drag any cursor from your **Library**
2. Drop it onto the cursor type you want to change in the **Active** section
3. The change applies instantly

### App Modes

- **Simple Mode** — Customize just the 2 main cursors (your regular pointer and link pointer)
- **Advanced Mode** — Fine-tune all 15 cursor types individually

## 📜 Changelog

See **[CHANGELOG.md](CHANGELOG.md)** for release details.

---

## 👨‍💻 For Developers

### Tech Stack

| Technology | Purpose |
|------------|---------|
| Rust + Tauri | Core framework — native performance |
| React + TypeScript | UI components |
| Vite | Build tool |
| TailwindCSS | Styling |
| Zustand | State management |

---

### Development Commands

<details>
<summary>▶️ Run in Development Mode</summary>

**Requirements:**
- Rust (latest stable)
- Node.js (v18+)
- Tauri CLI (`cargo install tauri-cli`)

```bash
cargo tauri dev
```

</details>

<details>
<summary>📦 Build for Production</summary>

**Requirements:**
- Visual Studio 2022 with C++ tools & Windows SDK
- NSIS (for installer)

```bash
cargo tauri build
```

The installer will be created in `src-tauri/target/release/bundle/`.

</details>

---

<div align="center">

_Made with ❤️ by **[dave-ying](https://github.com/dave-ying)**_

</div>
