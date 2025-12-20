/// Parse .CUR file and extract click point coordinates (also known as hotspot)
/// Returns (click_point_x, click_point_y) or (0, 0) if parsing fails
#[allow(dead_code)]
pub fn parse_cur_click_point(bytes: &[u8]) -> (u16, u16) {
    // .CUR format is essentially .ICO with click point info
    // Structure:
    // ICONDIR header (6 bytes)
    // ICONDIRENTRY entries (16 bytes each)
    //   - At offset 4-5: X click point (little endian u16, also known as hotspot)
    //   - At offset 6-7: Y click point (little endian u16, also known as hotspot)

    if bytes.len() < 22 {
        return (0, 0); // File too small
    }

    // Check if it's a valid cursor file
    // First 2 bytes should be 0x0000, next 2 bytes should be 0x0002 (cursor type)
    if bytes[0] != 0 || bytes[1] != 0 || bytes[2] != 2 || bytes[3] != 0 {
        return (0, 0); // Not a valid .CUR file
    }

    // Read click point from first ICONDIRENTRY (at offset 6)
    // Click point X at bytes 10-11 (offset 6 + 4, also known as hotspot)
    // Click point Y at bytes 12-13 (offset 6 + 6, also known as hotspot)
    let click_point_x = u16::from_le_bytes([bytes[10], bytes[11]]);
    let click_point_y = u16::from_le_bytes([bytes[12], bytes[13]]);

    (click_point_x, click_point_y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_cur_click_point_reads_valid_coordinates() {
        let mut bytes = vec![0u8; 22];
        bytes[2] = 2; // cursor type
        bytes[4] = 1; // images
        bytes[6] = 16; // width
        bytes[7] = 16; // height
        bytes[10] = 5; // click point x low byte
        bytes[12] = 10; // click point y low byte

        let (x, y) = parse_cur_click_point(&bytes);
        assert_eq!(x, 5);
        assert_eq!(y, 10);
    }

    #[test]
    fn parse_cur_click_point_returns_zero_for_invalid_data() {
        let bytes = vec![1u8; 10];
        let (x, y) = parse_cur_click_point(&bytes);
        assert_eq!(x, 0);
        assert_eq!(y, 0);
    }
}
