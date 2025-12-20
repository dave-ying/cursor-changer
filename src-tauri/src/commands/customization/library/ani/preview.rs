use std::fs;

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

    let frame_results: Vec<Option<String>> = frame_indices
        .par_iter()
        .map(|&frame_idx| {
            if frame_idx >= ani.frames.len() {
                return None;
            }
            let frame_data = &ani.frames[frame_idx];
            super::render::frame_to_png_data_url(frame_data).ok()
        })
        .collect();

    let mut frames: Vec<String> = Vec::with_capacity(frame_results.len());
    let mut final_delays: Vec<u32> = Vec::with_capacity(frame_results.len());

    for (idx, result) in frame_results.into_iter().enumerate() {
        if let Some(data_url) = result {
            frames.push(data_url);
            final_delays.push(delays[idx]);
        }
    }

    if frames.is_empty() {
        return Err("Failed to extract any frames from ANI file".to_string());
    }

    let total_duration: u32 = final_delays.iter().sum();

    Ok(AniPreviewData {
        frames,
        delays: final_delays,
        total_duration,
    })
}

impl From<AniError> for String {
    fn from(value: AniError) -> Self {
        value.to_string()
    }
}
