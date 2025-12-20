pub(super) fn convert_ani_to_gif(data: &[u8]) -> Option<Vec<u8>> {
    use image::{
        codecs::gif::{GifEncoder, Repeat},
        Delay, Frame, ImageBuffer, Rgba,
    };

    let ani = super::parser::parse_ani_file(data).ok()?;

    if ani.frames.is_empty() {
        return None;
    }

    let mut rgba_frames: Vec<(ImageBuffer<Rgba<u8>, Vec<u8>>, u32)> = Vec::new();

    let frame_indices: Vec<usize> = if ani.sequence.is_empty() {
        (0..ani.frames.len()).collect()
    } else {
        ani.sequence.iter().map(|&i| i as usize).collect()
    };

    for (step_idx, &frame_idx) in frame_indices.iter().enumerate() {
        if frame_idx >= ani.frames.len() {
            continue;
        }

        let frame_data = &ani.frames[frame_idx];
        let img = super::render::frame_to_rgba(frame_data).ok()?;

        let jiffies = if step_idx < ani.rates.len() {
            ani.rates[step_idx]
        } else {
            ani.default_rate
        };

        rgba_frames.push((img, jiffies));
    }

    if rgba_frames.is_empty() {
        return None;
    }

    let max_width = rgba_frames
        .iter()
        .map(|(img, _)| img.width())
        .max()
        .unwrap_or(32);
    let max_height = rgba_frames
        .iter()
        .map(|(img, _)| img.height())
        .max()
        .unwrap_or(32);

    let mut gif_frames: Vec<Frame> = Vec::new();

    for (img, jiffies) in rgba_frames {
        let mut canvas: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::new(max_width, max_height);
        let offset_x = (max_width - img.width()) / 2;
        let offset_y = (max_height - img.height()) / 2;

        for (x, y, pixel) in img.enumerate_pixels() {
            canvas.put_pixel(x + offset_x, y + offset_y, *pixel);
        }

        let delay_cs = ((jiffies as f64) * (100.0 / 60.0)).round() as u32;
        let delay_cs = delay_cs.max(2);

        let delay =
            Delay::from_saturating_duration(std::time::Duration::from_millis(delay_cs as u64 * 10));
        let frame = Frame::from_parts(canvas, 0, 0, delay);
        gif_frames.push(frame);
    }

    let mut gif_data: Vec<u8> = Vec::new();
    {
        let mut encoder = GifEncoder::new(&mut gif_data);
        encoder.set_repeat(Repeat::Infinite).ok()?;
        encoder.encode_frames(gif_frames).ok()?;
    }

    Some(gif_data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convert_ani_to_gif_returns_none_for_invalid() {
        assert!(convert_ani_to_gif(&[]).is_none());
        assert!(convert_ani_to_gif(&[0; 100]).is_none());
    }
}
