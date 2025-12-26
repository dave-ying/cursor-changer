/// Image to cursor conversion operations
use std::path::{Path, PathBuf};

use crate::cursor_converter;
use crate::paths;
use image::{imageops::FilterType, ImageBuffer, Rgba};
use tauri::AppHandle;

enum ConversionInput<'a> {
    Path(&'a str),
    Bytes { data: &'a [u8], filename: &'a str },
}

struct TempSvgFile {
    path: PathBuf,
}

impl TempSvgFile {
    fn new(data: &[u8]) -> Result<Self, String> {
        let temp_dir = std::env::temp_dir();
        let temp_stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Failed to get system time: {}", e))?
            .as_nanos();
        let path = temp_dir.join(format!(
            "cursor_temp_{}_{}.svg",
            std::process::id(),
            temp_stamp
        ));
        std::fs::write(&path, data).map_err(|e| format!("Failed to write temp SVG: {}", e))?;
        Ok(Self { path })
    }

    fn as_path_str(&self) -> String {
        self.path.to_string_lossy().to_string()
    }
}

impl Drop for TempSvgFile {
    fn drop(&mut self) {
        let _ = std::fs::remove_file(&self.path);
    }
}

fn file_stem_or_default(path_or_filename: &str) -> &str {
    Path::new(path_or_filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("cursor")
}

fn extension_lower(path_or_filename: &str) -> String {
    Path::new(path_or_filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default()
}

fn make_output_path(file_stem: &str) -> Result<String, String> {
    let cursors_dir = paths::cursors_dir()?;
    let base_name = format!("{}.cur", file_stem);
    let mut candidate = cursors_dir.join(&base_name);

    if !candidate.exists() {
        return Ok(candidate.to_string_lossy().to_string());
    }

    // Fallback to sequential suffixes: name_2.cur, name_3.cur, ...
    for idx in 2u32.. {
        let filename = format!("{}_{}.cur", file_stem, idx);
        candidate = cursors_dir.join(&filename);
        if !candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }

    Err("Unable to generate unique cursor filename".to_string())
}

fn convert_to_cur_impl(
    input: ConversionInput<'_>,
    size: u32,
    click_point_x: u16,
    click_point_y: u16,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<String, String> {
    if !scale.is_finite() || scale <= 0.0 {
        return Err("Scale must be a finite positive number".to_string());
    }

    let file_stem = match input {
        ConversionInput::Path(input_path) => file_stem_or_default(input_path),
        ConversionInput::Bytes { filename, .. } => file_stem_or_default(filename),
    };

    let output_path_str = make_output_path(file_stem)?;

    match input {
        ConversionInput::Path(input_path) => {
            cursor_converter::convert_to_cur(
                input_path,
                &output_path_str,
                size,
                click_point_x,
                click_point_y,
                scale,
                offset_x,
                offset_y,
            )?;
            Ok(output_path_str)
        }
        ConversionInput::Bytes { data, filename } => {
            let ext = extension_lower(filename);
            let size = size.min(cursor_converter::MAX_CURSOR_SIZE);

            let image = if ext == "svg" {
                let temp_svg = TempSvgFile::new(data)?;
                let temp_path_str = temp_svg.as_path_str();
                cursor_converter::load_svg(&temp_path_str, size, scale, offset_x, offset_y)?
            } else {
                load_raster_image_from_bytes(data, size, scale, offset_x, offset_y)?
            };

            let cur_data =
                cursor_converter::generate_cur_data(&image, click_point_x, click_point_y)?;

            std::fs::write(&output_path_str, cur_data)
                .map_err(|e| format!("Failed to write .CUR file: {}", e))?;

            Ok(output_path_str)
        }
    }
}

/// Convert an image file to .CUR format
/// Returns the path to the converted .CUR file
pub fn convert_image_to_cur(input_path: &str, _app: &AppHandle) -> Result<String, String> {
    convert_to_cur_impl(
        ConversionInput::Path(input_path),
        cursor_converter::MAX_CURSOR_SIZE,
        0,
        0,
        1.0,
        0,
        0,
    )
}

/// Convert image bytes directly to .CUR format WITHOUT saving the source image.
/// This is the preferred method for uploads to avoid leaving source images on disk.
/// Returns the path to the converted .CUR file.
pub fn convert_image_bytes_to_cur(
    data: &[u8],
    filename: &str,
    _app: &AppHandle,
) -> Result<String, String> {
    convert_to_cur_impl(
        ConversionInput::Bytes { data, filename },
        cursor_converter::MAX_CURSOR_SIZE,
        0,
        0,
        1.0,
        0,
        0,
    )
}

/// Convert image bytes directly to .CUR format with explicit click point and transformations.
/// This is the preferred method for uploads to avoid leaving source images on disk.
/// Returns the path to the converted .CUR file.
pub fn convert_image_bytes_to_cur_with_click_point(
    data: &[u8],
    filename: &str,
    size: u32,
    click_point_x: u16,
    click_point_y: u16,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<String, String> {
    convert_to_cur_impl(
        ConversionInput::Bytes { data, filename },
        size,
        click_point_x,
        click_point_y,
        scale,
        offset_x,
        offset_y,
    )
}

/// Load a raster image from bytes and resize if needed
///
/// This function replicates the frontend's CSS rendering behavior:
/// 1. First, the image is fit to the canvas using "object-fit: contain" logic
/// 2. Then, scale and translate transforms are applied from the center (transform-origin: center)
fn load_raster_image_from_bytes(
    data: &[u8],
    size: u32,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>, String> {
    if !scale.is_finite() || scale <= 0.0 {
        return Err("Scale must be a finite positive number".to_string());
    }

    // Load image from bytes
    let img = image::load_from_memory(data)
        .map_err(|e| format!("Failed to load image from bytes: {}", e))?;

    // Convert to RGBA
    let img = img.to_rgba8();

    // Create a transparent canvas of target size
    let mut canvas = ImageBuffer::from_pixel(size, size, Rgba([0, 0, 0, 0]));

    let img_width = img.width() as f32;
    let img_height = img.height() as f32;
    let canvas_size = size as f32;

    // Step 1: Calculate "object-fit: contain" base size
    // This fits the image within the canvas while maintaining aspect ratio
    let contain_scale = (canvas_size / img_width).min(canvas_size / img_height);
    let base_width = img_width * contain_scale;
    let base_height = img_height * contain_scale;

    // Step 2: Apply the user's scale transform on top of the contained size
    let final_width = (base_width * scale) as u32;
    let final_height = (base_height * scale) as u32;

    if final_width == 0 || final_height == 0 {
        return Err("Scale too small: rendered image would be empty".to_string());
    }

    // Resize the image to the final dimensions
    let scaled_img = image::imageops::resize(&img, final_width, final_height, FilterType::Lanczos3);

    // Step 3: Calculate position with transform-origin: center
    // The image is centered, then offset is applied (offset is in pre-scale pixels, so multiply by scale)
    let center_x = (canvas_size - final_width as f32) / 2.0;
    let center_y = (canvas_size - final_height as f32) / 2.0;

    // Offset values from frontend are in the coordinate space after contain-fit but before scale
    // CSS: transform: scale(s) translate(ox, oy) means translate happens in scaled space
    // So we need to multiply offset by scale
    let final_x = (center_x + (offset_x as f32 * scale)).round() as i32;
    let final_y = (center_y + (offset_y as f32 * scale)).round() as i32;

    // Composite the scaled image onto the canvas
    for y in 0..final_height {
        for x in 0..final_width {
            let canvas_x = final_x + x as i32;
            let canvas_y = final_y + y as i32;

            // Only draw pixels that are within canvas bounds
            if canvas_x >= 0 && canvas_x < size as i32 && canvas_y >= 0 && canvas_y < size as i32 {
                let pixel = scaled_img.get_pixel(x, y);
                canvas.put_pixel(canvas_x as u32, canvas_y as u32, *pixel);
            }
        }
    }

    Ok(canvas)
}

/// Convert an image file to .CUR format with an explicit click point and size.
/// Returns the path to the converted .CUR file.
#[tauri::command]
pub fn convert_image_to_cur_with_click_point(
    _app: AppHandle,
    input_path: String,
    size: u32,
    click_point_x: u16,
    click_point_y: u16,
    scale: f32,
    offset_x: i32,
    offset_y: i32,
) -> Result<String, String> {
    convert_to_cur_impl(
        ConversionInput::Path(&input_path),
        size,
        click_point_x,
        click_point_y,
        scale,
        offset_x,
        offset_y,
    )
}
