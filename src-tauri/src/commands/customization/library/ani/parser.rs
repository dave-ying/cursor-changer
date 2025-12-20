use super::AniError;

pub(in super::super) struct AniData {
    pub(super) frames: Vec<Vec<u8>>,
    pub(super) rates: Vec<u32>,
    pub(super) default_rate: u32,
    pub(super) sequence: Vec<u32>,
}

pub(super) fn parse_ani_file(data: &[u8]) -> Result<AniData, AniError> {
    if data.len() < 20 {
        return Err(AniError::InvalidFormat("file too small"));
    }

    if &data[0..4] != b"RIFF" {
        return Err(AniError::InvalidFormat("missing RIFF header"));
    }

    if &data[8..12] != b"ACON" {
        return Err(AniError::InvalidFormat("missing ACON header"));
    }

    let mut frames: Vec<Vec<u8>> = Vec::new();
    let mut rates: Vec<u32> = Vec::new();
    let mut sequence: Vec<u32> = Vec::new();
    let mut default_rate: u32 = 10;

    let mut pos = 12;

    while pos + 8 <= data.len() {
        let chunk_id = &data[pos..pos + 4];
        let chunk_size =
            u32::from_le_bytes([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]])
                as usize;

        match chunk_id {
            b"anih" => {
                if chunk_size >= 36 && pos + 8 + 36 <= data.len() {
                    let anih_data = &data[pos + 8..pos + 8 + chunk_size];
                    if anih_data.len() >= 32 {
                        default_rate = u32::from_le_bytes([
                            anih_data[28],
                            anih_data[29],
                            anih_data[30],
                            anih_data[31],
                        ]);
                        if default_rate == 0 {
                            default_rate = 10;
                        }
                    }
                }
            }
            b"rate" => {
                let rate_data = &data[pos + 8..pos + 8 + chunk_size.min(data.len() - pos - 8)];
                for chunk in rate_data.chunks_exact(4) {
                    rates.push(u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
                }
            }
            b"seq " => {
                let seq_data = &data[pos + 8..pos + 8 + chunk_size.min(data.len() - pos - 8)];
                for chunk in seq_data.chunks_exact(4) {
                    sequence.push(u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]));
                }
            }
            b"LIST" if pos + 12 <= data.len() => {
                let list_type = &data[pos + 8..pos + 12];

                if list_type == b"fram" {
                    let list_end = (pos + 8 + chunk_size).min(data.len());
                    let mut frame_pos = pos + 12;

                    while frame_pos + 8 <= list_end {
                        let frame_id = &data[frame_pos..frame_pos + 4];
                        let frame_size = u32::from_le_bytes([
                            data[frame_pos + 4],
                            data[frame_pos + 5],
                            data[frame_pos + 6],
                            data[frame_pos + 7],
                        ]) as usize;

                        if frame_id == b"icon" {
                            let frame_start = frame_pos + 8;
                            let frame_end = (frame_start + frame_size).min(data.len());

                            if frame_end > frame_start {
                                frames.push(data[frame_start..frame_end].to_vec());
                            }
                        }

                        frame_pos += 8 + frame_size;
                        if frame_size % 2 != 0 {
                            frame_pos += 1;
                        }
                    }
                }
            }
            b"icon" => {
                let frame_start = pos + 8;
                let frame_end = (frame_start + chunk_size).min(data.len());

                if frame_end > frame_start {
                    frames.push(data[frame_start..frame_end].to_vec());
                }
            }
            _ => {}
        }

        pos += 8 + chunk_size;
        if chunk_size % 2 != 0 {
            pos += 1;
        }
    }

    if frames.is_empty() {
        return Err(AniError::NoFrames);
    }

    Ok(AniData {
        frames,
        rates,
        default_rate,
        sequence,
    })
}

pub(super) fn extract_ani_first_frame(data: &[u8]) -> Option<Vec<u8>> {
    parse_ani_file(data)
        .ok()
        .and_then(|ani| ani.frames.into_iter().next())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_ani_first_frame_invalid_data() {
        assert!(extract_ani_first_frame(&[]).is_none());
        assert!(extract_ani_first_frame(&[0; 10]).is_none());
        assert!(extract_ani_first_frame(&[0; 100]).is_none());

        let mut wrong_form = vec![0u8; 100];
        wrong_form[0..4].copy_from_slice(b"RIFF");
        wrong_form[8..12].copy_from_slice(b"WAVE");
        assert!(extract_ani_first_frame(&wrong_form).is_none());
    }

    #[test]
    fn test_extract_ani_first_frame_valid_structure() {
        let mut ani_data = Vec::new();

        ani_data.extend_from_slice(b"RIFF");
        ani_data.extend_from_slice(&0u32.to_le_bytes());
        ani_data.extend_from_slice(b"ACON");

        ani_data.extend_from_slice(b"LIST");
        let list_size_pos = ani_data.len();
        ani_data.extend_from_slice(&0u32.to_le_bytes());
        ani_data.extend_from_slice(b"fram");

        ani_data.extend_from_slice(b"icon");
        let fake_cur = vec![0u8; 22];
        ani_data.extend_from_slice(&(fake_cur.len() as u32).to_le_bytes());
        ani_data.extend_from_slice(&fake_cur);

        let list_size = ani_data.len() - list_size_pos - 4;
        ani_data[list_size_pos..list_size_pos + 4]
            .copy_from_slice(&(list_size as u32).to_le_bytes());

        let riff_size = ani_data.len() - 8;
        ani_data[4..8].copy_from_slice(&(riff_size as u32).to_le_bytes());

        let result = extract_ani_first_frame(&ani_data);
        assert!(result.is_some());
        assert_eq!(result.unwrap().len(), fake_cur.len());
    }

    #[test]
    fn test_parse_ani_file_invalid_data() {
        assert!(parse_ani_file(&[]).is_err());
        assert!(parse_ani_file(&[0; 10]).is_err());
        assert!(parse_ani_file(&[0; 100]).is_err());

        let mut wrong_form = vec![0u8; 100];
        wrong_form[0..4].copy_from_slice(b"RIFF");
        wrong_form[8..12].copy_from_slice(b"WAVE");
        assert!(parse_ani_file(&wrong_form).is_err());
    }

    #[test]
    fn test_parse_ani_file_extracts_multiple_frames() {
        let mut ani_data = Vec::new();

        ani_data.extend_from_slice(b"RIFF");
        ani_data.extend_from_slice(&0u32.to_le_bytes());
        ani_data.extend_from_slice(b"ACON");

        ani_data.extend_from_slice(b"anih");
        ani_data.extend_from_slice(&36u32.to_le_bytes());
        ani_data.extend_from_slice(&36u32.to_le_bytes());
        ani_data.extend_from_slice(&3u32.to_le_bytes());
        ani_data.extend_from_slice(&3u32.to_le_bytes());
        ani_data.extend_from_slice(&32u32.to_le_bytes());
        ani_data.extend_from_slice(&32u32.to_le_bytes());
        ani_data.extend_from_slice(&32u32.to_le_bytes());
        ani_data.extend_from_slice(&1u32.to_le_bytes());
        ani_data.extend_from_slice(&5u32.to_le_bytes());
        ani_data.extend_from_slice(&0u32.to_le_bytes());

        ani_data.extend_from_slice(b"LIST");
        let list_size_pos = ani_data.len();
        ani_data.extend_from_slice(&0u32.to_le_bytes());
        ani_data.extend_from_slice(b"fram");

        for i in 0..3 {
            ani_data.extend_from_slice(b"icon");
            let fake_cur = vec![i as u8; 22];
            ani_data.extend_from_slice(&(fake_cur.len() as u32).to_le_bytes());
            ani_data.extend_from_slice(&fake_cur);
        }

        let list_size = ani_data.len() - list_size_pos - 4;
        ani_data[list_size_pos..list_size_pos + 4]
            .copy_from_slice(&(list_size as u32).to_le_bytes());

        let riff_size = ani_data.len() - 8;
        ani_data[4..8].copy_from_slice(&(riff_size as u32).to_le_bytes());

        let ani = parse_ani_file(&ani_data).unwrap();
        assert_eq!(ani.frames.len(), 3);
        assert_eq!(ani.default_rate, 5);

        for (i, frame) in ani.frames.iter().enumerate() {
            assert_eq!(frame.len(), 22);
            assert!(frame.iter().all(|&b| b == i as u8));
        }
    }

    #[test]
    fn test_parse_ani_file_with_rate_chunk() {
        let mut ani_data = Vec::new();

        ani_data.extend_from_slice(b"RIFF");
        ani_data.extend_from_slice(&0u32.to_le_bytes());
        ani_data.extend_from_slice(b"ACON");

        ani_data.extend_from_slice(b"rate");
        ani_data.extend_from_slice(&12u32.to_le_bytes());
        ani_data.extend_from_slice(&3u32.to_le_bytes());
        ani_data.extend_from_slice(&6u32.to_le_bytes());
        ani_data.extend_from_slice(&9u32.to_le_bytes());

        ani_data.extend_from_slice(b"LIST");
        let list_size_pos = ani_data.len();
        ani_data.extend_from_slice(&0u32.to_le_bytes());
        ani_data.extend_from_slice(b"fram");

        for _ in 0..3 {
            ani_data.extend_from_slice(b"icon");
            let fake_cur = vec![0u8; 22];
            ani_data.extend_from_slice(&(fake_cur.len() as u32).to_le_bytes());
            ani_data.extend_from_slice(&fake_cur);
        }

        let list_size = ani_data.len() - list_size_pos - 4;
        ani_data[list_size_pos..list_size_pos + 4]
            .copy_from_slice(&(list_size as u32).to_le_bytes());

        let riff_size = ani_data.len() - 8;
        ani_data[4..8].copy_from_slice(&(riff_size as u32).to_le_bytes());

        let ani = parse_ani_file(&ani_data).unwrap();
        assert_eq!(ani.rates, vec![3, 6, 9]);
    }
}
