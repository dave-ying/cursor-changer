use std::fs;
use std::path::Path;

fn main() {
    let registry_src_path = Path::new("src/commands/registry.rs");
    println!("cargo:rerun-if-changed={}", registry_src_path.display());
    println!("cargo:rerun-if-changed=build.rs");

    if let Ok(registry_src) = fs::read_to_string(registry_src_path) {
        if let (Some(start), Some(end)) = (
            registry_src.find("tauri::generate_handler!["),
            registry_src.rfind("]"),
        ) {
            let handler_block = &registry_src[start..=end];
            let open = handler_block
                .find('[')
                .map(|i| i + 1)
                .unwrap_or(handler_block.len());
            let close = handler_block.rfind(']').unwrap_or(handler_block.len());
            let list = &handler_block[open..close];

            let mut entries: Vec<(String, String)> = Vec::new();
            for line in list.lines() {
                let line = line.trim();
                if line.is_empty() {
                    continue;
                }
                let line = line.trim_end_matches(',');
                if !line.starts_with("crate::") {
                    continue;
                }
                let Some(fn_name) = line.split("::").last() else {
                    continue;
                };
                let mut parts = fn_name.split('_');
                let Some(first) = parts.next() else {
                    continue;
                };
                let mut key = String::from(first);
                for part in parts {
                    let mut chars = part.chars();
                    if let Some(c0) = chars.next() {
                        key.push(c0.to_ascii_uppercase());
                        key.extend(chars);
                    }
                }
                entries.push((key, fn_name.to_string()));
            }

            let mut ts = String::new();
            ts.push_str("export const Commands = {\n");
            for (key, value) in &entries {
                ts.push_str("  ");
                ts.push_str(key);
                ts.push_str(": '");
                ts.push_str(value);
                ts.push_str("',\n");
            }
            ts.push_str("} as const;\n\n");
            ts.push_str("export type CommandName = (typeof Commands)[keyof typeof Commands];\n");

            let out_path = Path::new("../frontend-vite/src/tauri/commands.generated.ts");
            if let Some(parent) = out_path.parent() {
                let _ = fs::create_dir_all(parent);
            }
            let _ = fs::write(out_path, ts);
        }
    }

    // If a patched sidebar stylesheet exists in `src-tauri/patches/sidebar.css`,
    // copy it into the dist styles directory so builds always include the fix.
    let patch_src = Path::new("patches/sidebar.css");
    let patch_dest = Path::new("../frontend-vite/dist/styles/sidebar.css");
    if patch_src.exists() && patch_src.is_file() {
        if let Some(parent) = patch_dest.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                eprintln!("Warning: Failed to create dist/styles directory: {e}");
            }
        }
        match fs::copy(patch_src, patch_dest) {
            Ok(_) => println!("Copied patched sidebar.css to dist/styles/sidebar.css"),
            Err(e) => eprintln!("Warning: Failed to copy patched sidebar.css: {e}"),
        }
    }

    tauri_build::build();
}
