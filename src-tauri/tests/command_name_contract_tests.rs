use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
};

fn read_to_string(path: &Path) -> String {
    fs::read_to_string(path).unwrap_or_else(|e| panic!("failed to read {}: {e}", path.display()))
}

fn extract_rust_command_names(registry_rs: &str) -> HashSet<String> {
    let mut names = HashSet::new();

    for raw_line in registry_rs.lines() {
        let line = raw_line.trim();

        if line.is_empty() || line.starts_with("//") {
            continue;
        }

        // Example lines:
        // crate::commands::cursor_commands::get_status,
        // crate::commands::customization::file_ops::conversion::convert_image_to_cur_with_click_point,
        if !line.starts_with("crate::commands::") {
            continue;
        }

        let last_segment = line
            .split("::")
            .last()
            .unwrap_or("")
            .trim()
            .trim_end_matches(',');

        if !last_segment.is_empty() {
            names.insert(last_segment.to_string());
        }
    }

    names
}

fn extract_ts_command_names(commands_ts: &str) -> HashSet<String> {
    let mut names = HashSet::new();

    let Some(commands_decl_idx) = commands_ts.find("export const Commands") else {
        return names;
    };
    let Some(open_brace_rel) = commands_ts[commands_decl_idx..].find('{') else {
        return names;
    };

    let mut depth = 0usize;
    let mut in_line_comment = false;
    let mut in_block_comment = false;
    let mut in_string: Option<char> = None;
    let mut prev: Option<char> = None;

    let start_idx = commands_decl_idx + open_brace_rel;
    let mut i = start_idx;
    let chars: Vec<char> = commands_ts.chars().collect();

    // Parse the Commands object by scanning from '{' to the matching '}' and extracting
    // all RHS string literals of `key: 'value'` pairs (outside comments/strings).
    while i < chars.len() {
        let c = chars[i];

        if in_line_comment {
            if c == '\n' {
                in_line_comment = false;
            }
            prev = Some(c);
            i += 1;
            continue;
        }

        if in_block_comment {
            if prev == Some('*') && c == '/' {
                in_block_comment = false;
            }
            prev = Some(c);
            i += 1;
            continue;
        }

        if let Some(q) = in_string {
            if c == q && prev != Some('\\') {
                in_string = None;
            }
            prev = Some(c);
            i += 1;
            continue;
        }

        // Enter comments
        if prev == Some('/') && c == '/' {
            in_line_comment = true;
            prev = Some(c);
            i += 1;
            continue;
        }
        if prev == Some('/') && c == '*' {
            in_block_comment = true;
            prev = Some(c);
            i += 1;
            continue;
        }

        // Enter strings
        if c == '\'' || c == '"' {
            in_string = Some(c);
            prev = Some(c);
            i += 1;
            continue;
        }

        // Track object brace depth
        if c == '{' {
            depth += 1;
            prev = Some(c);
            i += 1;
            continue;
        }
        if c == '}' {
            if depth == 0 {
                break;
            }
            depth -= 1;
            prev = Some(c);
            i += 1;
            if depth == 0 {
                break;
            }
            continue;
        }

        // Extract values from `key: 'value'` pairs at top-level within Commands object.
        if depth == 1 && c == ':' {
            let mut j = i + 1;
            while j < chars.len() && chars[j].is_whitespace() {
                j += 1;
            }

            if j < chars.len() && (chars[j] == '\'' || chars[j] == '"') {
                let quote = chars[j];
                j += 1;

                let mut value = String::new();
                while j < chars.len() {
                    let cc = chars[j];
                    if cc == quote && chars.get(j.wrapping_sub(1)) != Some(&'\\') {
                        break;
                    }
                    value.push(cc);
                    j += 1;
                }

                if !value.is_empty() {
                    names.insert(value);
                }
            }
        }

        prev = Some(c);
        i += 1;
    }

    names
}

#[test]
fn frontend_command_names_match_rust_registry() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));

    let registry_path = manifest_dir
        .join("src")
        .join("commands")
        .join("registry.rs");
    let registry_rs = read_to_string(&registry_path);
    let rust_command_names = extract_rust_command_names(&registry_rs);

    assert!(
        !rust_command_names.is_empty(),
        "expected to parse at least one Rust command from {}",
        registry_path.display()
    );

    let commands_ts_path = manifest_dir
        .join("..")
        .join("frontend-vite")
        .join("src")
        .join("tauri")
        .join("commands.ts");
    let commands_ts = read_to_string(&commands_ts_path);
    let mut ts_command_names = extract_ts_command_names(&commands_ts);

    let commands_generated_ts_path = manifest_dir
        .join("..")
        .join("frontend-vite")
        .join("src")
        .join("tauri")
        .join("commands.generated.ts");

    if ts_command_names.is_empty() {
        let commands_generated_ts = read_to_string(&commands_generated_ts_path);
        ts_command_names = extract_ts_command_names(&commands_generated_ts);
    }

    assert!(
        !ts_command_names.is_empty(),
        "expected to parse at least one command from {} or {}",
        commands_ts_path.display(),
        commands_generated_ts_path.display()
    );

    let mut missing_in_rust: Vec<String> = ts_command_names
        .difference(&rust_command_names)
        .cloned()
        .collect();
    missing_in_rust.sort();

    assert!(
        missing_in_rust.is_empty(),
        "frontend references Tauri commands not registered in Rust (from {} vs {}):\n{}",
        commands_ts_path.display(),
        registry_path.display(),
        missing_in_rust.join("\n")
    );

    let mut missing_in_ts: Vec<String> = rust_command_names
        .difference(&ts_command_names)
        .cloned()
        .collect();
    missing_in_ts.sort();

    assert!(
        missing_in_ts.is_empty(),
        "Rust registers Tauri commands missing from frontend Commands (from {} vs {}):\n{}",
        registry_path.display(),
        commands_ts_path.display(),
        missing_in_ts.join("\n")
    );
}
