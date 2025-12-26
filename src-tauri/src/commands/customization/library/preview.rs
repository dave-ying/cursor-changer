use std::fs;
use std::path::Path;

use crate::utils::encoding::base64_encode;

pub(super) fn get_library_cursor_preview(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_lowercase());

    if matches!(ext.as_deref(), Some("svg")) {
        let png_bytes = crate::cursor_converter::render_svg_to_png_bytes(
            &file_path,
            crate::cursor_converter::MAX_CURSOR_SIZE,
        )?;
        let base64 = base64_encode(&png_bytes);
        return Ok(format!("data:image/png;base64,{}", base64));
    }

    let bytes = fs::read(path).map_err(|e| format!("Failed to read file: {}", e))?;
    preview_data_from_bytes(&bytes, ext.as_deref())
}

pub(super) fn get_library_cursor_preview_from_bytes(
    bytes: &[u8],
    file_name: Option<&str>,
) -> Result<String, String> {
    let ext = file_name
        .and_then(|name| Path::new(name).extension().and_then(|e| e.to_str()))
        .map(|s| s.to_lowercase());
    preview_data_from_bytes(bytes, ext.as_deref())
}

fn preview_data_from_bytes(bytes: &[u8], ext_hint: Option<&str>) -> Result<String, String> {
    let ext = ext_hint.unwrap_or_default();

    if ext == "ani" {
        if let Some(gif_bytes) = super::ani::convert_ani_to_gif(bytes) {
            let base64 = base64_encode(&gif_bytes);
            return Ok(format!("data:image/gif;base64,{}", base64));
        }

        if let Some(frame_data) = super::ani::extract_ani_first_frame(bytes) {
            if let Some(png) = extract_embedded_png(&frame_data) {
                let png = ensure_square_png_bytes(&png).unwrap_or(png);
                let base64 = base64_encode(&png);
                return Ok(format!("data:image/png;base64,{}", base64));
            }
            if let Some(png_bytes) = convert_cur_dib_to_png(&frame_data) {
                let base64 = base64_encode(&png_bytes);
                return Ok(format!("data:image/png;base64,{}", base64));
            }
        }

        if let Some(png) = extract_embedded_png(bytes) {
            let png = ensure_square_png_bytes(&png).unwrap_or(png);
            let base64 = base64_encode(&png);
            return Ok(format!("data:image/png;base64,{}", base64));
        }
    }

    if ext == "cur" || ext == "ico" {
        if let Some(png) = extract_embedded_png(bytes) {
            let png = ensure_square_png_bytes(&png).unwrap_or(png);
            let base64 = base64_encode(&png);
            return Ok(format!("data:image/png;base64,{}", base64));
        }

        if let Some(png_bytes) = convert_cur_dib_to_png(bytes) {
            let base64 = base64_encode(&png_bytes);
            return Ok(format!("data:image/png;base64,{}", base64));
        }
    }

    let base64 = base64_encode(bytes);
    let mime_type = match ext {
        "cur" | "ico" => "image/x-icon",
        "ani" => "application/x-navi-animation",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "bmp" => "image/bmp",
        _ => "application/octet-stream",
    };

    Ok(format!("data:{};base64,{}", mime_type, base64))
}

pub(super) fn frame_to_rgba_dib_only(
    frame_data: &[u8],
) -> Option<image::ImageBuffer<image::Rgba<u8>, Vec<u8>>> {
    use image::{ImageBuffer, Rgba};

    if frame_data.len() < 22 {
        return None;
    }

    let count = u16::from_le_bytes([frame_data[4], frame_data[5]]);
    if count == 0 {
        return None;
    }

    let offset = u32::from_le_bytes([
        frame_data[18],
        frame_data[19],
        frame_data[20],
        frame_data[21],
    ]) as usize;
    let size = u32::from_le_bytes([
        frame_data[14],
        frame_data[15],
        frame_data[16],
        frame_data[17],
    ]) as usize;

    if offset >= frame_data.len() || offset + size > frame_data.len() {
        return None;
    }

    let image_data = &frame_data[offset..offset + size];

    if image_data.len() < 40 {
        return None;
    }

    let header_size =
        u32::from_le_bytes([image_data[0], image_data[1], image_data[2], image_data[3]]);
    if header_size != 40 {
        return None;
    }

    let bmp_width =
        u32::from_le_bytes([image_data[4], image_data[5], image_data[6], image_data[7]]);
    let bmp_height =
        u32::from_le_bytes([image_data[8], image_data[9], image_data[10], image_data[11]]) / 2;
    let bpp = u16::from_le_bytes([image_data[14], image_data[15]]);

    if bpp != 32 || bmp_width == 0 || bmp_height == 0 {
        return None;
    }

    let mut img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(bmp_width, bmp_height);

    let xor_offset = 40;
    let row_size = ((bmp_width * 32 + 31) / 32) * 4;

    for y in 0..bmp_height {
        let row_y = bmp_height - 1 - y;
        let row_offset = xor_offset + (y * row_size) as usize;

        if row_offset + (bmp_width * 4) as usize > image_data.len() {
            return None;
        }

        for x in 0..bmp_width {
            let pixel_offset = row_offset + (x * 4) as usize;
            if pixel_offset + 4 > image_data.len() {
                return None;
            }

            let b = image_data[pixel_offset];
            let g = image_data[pixel_offset + 1];
            let r = image_data[pixel_offset + 2];
            let a = image_data[pixel_offset + 3];

            img.put_pixel(x, row_y, Rgba([r, g, b, a]));
        }
    }

    Some(img)
}

pub(super) fn extract_embedded_png(data: &[u8]) -> Option<Vec<u8>> {
    const PNG_SIG: [u8; 8] = [0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    const IEND_PATTERN: [u8; 8] = [b'I', b'E', b'N', b'D', 0xAE, 0x42, 0x60, 0x82];

    let mut search_pos = 0;
    let start = loop {
        let pos = memchr::memchr(0x89, &data[search_pos..])?;
        let abs_pos = search_pos + pos;

        if abs_pos + PNG_SIG.len() <= data.len()
            && data[abs_pos..abs_pos + PNG_SIG.len()] == PNG_SIG
        {
            break abs_pos;
        }

        search_pos = abs_pos + 1;
        if search_pos >= data.len() {
            return None;
        }
    };

    let end_search = &data[start..];
    let mut end_search_pos = 0;
    let end = loop {
        let pos = memchr::memchr(b'I', &end_search[end_search_pos..])?;
        let abs_pos = end_search_pos + pos;

        if abs_pos + IEND_PATTERN.len() <= end_search.len()
            && end_search[abs_pos..abs_pos + IEND_PATTERN.len()] == IEND_PATTERN
        {
            break start + abs_pos + IEND_PATTERN.len();
        }

        end_search_pos = abs_pos + 1;
        if end_search_pos >= end_search.len() {
            return None;
        }
    };

    if end > start && (end - start) > 100 {
        Some(data[start..end].to_vec())
    } else {
        None
    }
}

pub(super) fn convert_cur_dib_to_png(data: &[u8]) -> Option<Vec<u8>> {
    use image::{ImageBuffer, Rgba};

    if data.len() < 22 {
        return None;
    }

    let offset = u32::from_le_bytes([data[18], data[19], data[20], data[21]]) as usize;
    let size = u32::from_le_bytes([data[14], data[15], data[16], data[17]]) as usize;

    if offset >= data.len() || offset + size > data.len() {
        return None;
    }

    let image_data = &data[offset..offset + size];

    if image_data.len() < 40 {
        return None;
    }

    let header_size =
        u32::from_le_bytes([image_data[0], image_data[1], image_data[2], image_data[3]]);
    if header_size != 40 {
        return None;
    }

    let bmp_width =
        u32::from_le_bytes([image_data[4], image_data[5], image_data[6], image_data[7]]);
    let bmp_height =
        u32::from_le_bytes([image_data[8], image_data[9], image_data[10], image_data[11]]) / 2;
    let bpp = u16::from_le_bytes([image_data[14], image_data[15]]);

    if bpp != 32 {
        return None;
    }

    let mut img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(bmp_width, bmp_height);

    let xor_offset = 40;
    let row_size = ((bmp_width * 32 + 31) / 32) * 4;

    for y in 0..bmp_height {
        let row_y = bmp_height - 1 - y;
        let row_offset = xor_offset + (y * row_size) as usize;

        if row_offset + (bmp_width * 4) as usize > image_data.len() {
            return None;
        }

        for x in 0..bmp_width {
            let pixel_offset = row_offset + (x * 4) as usize;
            if pixel_offset + 4 > image_data.len() {
                return None;
            }

            let b = image_data[pixel_offset];
            let g = image_data[pixel_offset + 1];
            let r = image_data[pixel_offset + 2];
            let a = image_data[pixel_offset + 3];

            img.put_pixel(x, row_y, Rgba([r, g, b, a]));
        }
    }

    encode_rgba_to_png(ensure_square_image(img))
}

fn ensure_square_png_bytes(data: &[u8]) -> Option<Vec<u8>> {
    use image::ImageFormat;

    let dynamic =
        image::load_from_memory_with_format(data, ImageFormat::Png).ok()?.to_rgba8();
    if dynamic.width() == dynamic.height() {
        return Some(data.to_vec());
    }

    encode_rgba_to_png(ensure_square_image(dynamic))
}

fn ensure_square_image(
    img: image::ImageBuffer<image::Rgba<u8>, Vec<u8>>,
) -> image::ImageBuffer<image::Rgba<u8>, Vec<u8>> {
    use image::{ImageBuffer, Rgba};

    let (width, height) = img.dimensions();
    if width == height {
        return img;
    }

    let size = width.max(height);
    let mut square = ImageBuffer::from_pixel(size, size, Rgba([0, 0, 0, 0]));
    let x_offset = (size - width) / 2;
    let y_offset = (size - height) / 2;

    for y in 0..height {
        for x in 0..width {
            if let Some(pixel) = img.get_pixel_checked(x, y) {
                square.put_pixel(x + x_offset, y + y_offset, *pixel);
            }
        }
    }

    square
}

fn encode_rgba_to_png(
    img: image::ImageBuffer<image::Rgba<u8>, Vec<u8>>,
) -> Option<Vec<u8>> {
    use image::{codecs::png::PngEncoder, ImageEncoder};

    let (width, height) = img.dimensions();
    let mut png_data = Vec::new();
    let encoder = PngEncoder::new(&mut png_data);
    encoder
        .write_image(
            img.as_raw(),
            width,
            height,
            image::ColorType::Rgba8.into(),
        )
        .ok()?;

    Some(png_data)
}
