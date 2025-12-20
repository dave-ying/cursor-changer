use image::{ImageBuffer, Rgba};

use crate::utils::encoding::base64_encode;

use super::AniError;

pub(super) fn frame_to_rgba(frame_data: &[u8]) -> Result<ImageBuffer<Rgba<u8>, Vec<u8>>, AniError> {
    if let Some(png_data) = super::super::preview::extract_embedded_png(frame_data) {
        let img =
            image::load_from_memory(&png_data).map_err(|e| AniError::ImageDecode(e.to_string()))?;
        return Ok(img.to_rgba8());
    }

    if frame_data.len() < 22 {
        return Err(AniError::InvalidFormat("frame data too small"));
    }

    let count = u16::from_le_bytes([frame_data[4], frame_data[5]]);
    if count == 0 {
        return Err(AniError::InvalidFormat("ico directory contains no images"));
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
        return Err(AniError::InvalidFormat("invalid image offset/size"));
    }

    let image_data = &frame_data[offset..offset + size];

    if image_data.len() >= 8
        && &image_data[0..8] == &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]
    {
        let img = image::load_from_memory(image_data)
            .map_err(|e| AniError::ImageDecode(e.to_string()))?;
        return Ok(img.to_rgba8());
    }

    super::super::preview::frame_to_rgba_dib_only(frame_data)
        .ok_or(AniError::InvalidFormat("failed to decode DIB frame"))
}

pub(super) fn frame_to_png_data_url(frame_data: &[u8]) -> Result<String, AniError> {
    if let Some(png_data) = super::super::preview::extract_embedded_png(frame_data) {
        if png_data.len() > 100 {
            let base64 = base64_encode(&png_data);
            return Ok(format!("data:image/png;base64,{}", base64));
        }
    }

    if frame_data.len() >= 22 {
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

        if offset < frame_data.len() && offset + size <= frame_data.len() {
            let image_data = &frame_data[offset..offset + size];
            if image_data.len() >= 8
                && &image_data[0..8] == &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]
            {
                let base64 = base64_encode(image_data);
                return Ok(format!("data:image/png;base64,{}", base64));
            }
        }
    }

    use image::codecs::png::PngEncoder;
    use image::ImageEncoder;

    let rgba_img = super::super::preview::frame_to_rgba_dib_only(frame_data)
        .ok_or(AniError::InvalidFormat("failed to decode DIB frame"))?;

    let estimated_size = (rgba_img.width() * rgba_img.height()) as usize;
    let mut png_bytes: Vec<u8> = Vec::with_capacity(estimated_size);

    let encoder = PngEncoder::new(&mut png_bytes);
    encoder
        .write_image(
            rgba_img.as_raw(),
            rgba_img.width(),
            rgba_img.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| AniError::ImageEncode(e.to_string()))?;

    let base64 = base64_encode(&png_bytes);
    Ok(format!("data:image/png;base64,{}", base64))
}
