use std::fs;
use std::io::Write;

use serde_json;

use rayon::prelude::*;

use super::super::AniPreviewData;
use super::AniError;

pub(super) async fn get_ani_preview_data(file_path: String) -> Result<AniPreviewData, String> {
    tauri::async_runtime::spawn_blocking(move || get_ani_preview_data_sync(&file_path))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

fn get_ani_preview_data_sync(file_path: &str) -> Result<AniPreviewData, String> {
    use std::path::Path;

    let path = Path::new(file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();

    if ext != "ani" {
        return Err("Not an ANI file".to_string());
    }

    let cache_root = crate::paths::ani_preview_cache_dir()?;
    let metadata = fs::metadata(path).map_err(|e| format!("Failed to stat file: {}", e))?;
    let file_size = metadata.len();
    let modified_secs = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let file_name_safe = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("ani")
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>();
    let cache_dir = cache_root.join(format!(
        "{}-{}-{}",
        file_name_safe, file_size, modified_secs
    ));
    let manifest_path = cache_dir.join("manifest.json");

    if manifest_path.exists() {
        let manifest = fs::read_to_string(&manifest_path)
            .map_err(|e| format!("Failed to read ANI preview manifest: {}", e))?;
        let cached: AniPreviewData = serde_json::from_str(&manifest)
            .map_err(|e| format!("Failed to parse ANI preview manifest: {}", e))?;
        if !cached.frames.is_empty() {
            return Ok(cached);
        }
    }

    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create ANI preview cache directory: {}", e))?;

    let bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let ani = super::parser::parse_ani_file(&bytes)
        .map_err(|e| format!("Failed to parse ANI file: {}", e))?;

    if ani.frames.is_empty() {
        return Err("ANI file has no frames".to_string());
    }

    let frame_indices: Vec<usize> = if ani.sequence.is_empty() {
        (0..ani.frames.len()).collect()
    } else {
        ani.sequence.iter().map(|&i| i as usize).collect()
    };

    let delays: Vec<u32> = frame_indices
        .iter()
        .enumerate()
        .map(|(step_idx, _)| {
            let jiffies = if step_idx < ani.rates.len() {
                ani.rates[step_idx]
            } else {
                ani.default_rate
            };
            ((jiffies as f64) * (1000.0 / 60.0)).round().max(16.0) as u32
        })
        .collect();

    let frame_results: Vec<Option<(String, u32)>> = frame_indices
        .par_iter()
        .enumerate()
        .map(|(step_idx, &frame_idx)| {
            if frame_idx >= ani.frames.len() {
                return None;
            }

            let frame_data = &ani.frames[frame_idx];
            let png_bytes = super::render::frame_to_png_bytes(frame_data).ok()?;

            let frame_path = cache_dir.join(format!("frame_{:04}.png", step_idx));
            if !frame_path.exists() {
                let mut out = fs::File::create(&frame_path).ok()?;
                out.write_all(&png_bytes).ok()?;
                out.flush().ok();
            }

            Some((frame_path.to_string_lossy().to_string(), delays[step_idx]))
        })
        .collect();

    let mut frames: Vec<String> = Vec::with_capacity(frame_results.len());
    let mut final_delays: Vec<u32> = Vec::with_capacity(frame_results.len());

    for entry in frame_results.into_iter().flatten() {
        frames.push(entry.0);
        final_delays.push(entry.1);
    }

    if frames.is_empty() {
        return Err("Failed to extract any frames from ANI file".to_string());
    }

    let total_duration: u32 = final_delays.iter().sum();

    let preview = AniPreviewData {
        frames,
        frames_are_paths: true,
        delays: final_delays,
        total_duration,
    };

    if let Ok(serialized) = serde_json::to_string(&preview) {
        let _ = fs::write(&manifest_path, serialized);
    }

    Ok(preview)
}

impl From<AniError> for String {
    fn from(value: AniError) -> Self {
        value.to_string()
    }
}
