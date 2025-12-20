// Simple base64 encoding without external dependencies
pub fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();

    let mut i = 0;
    while i < data.len() {
        let b1 = data[i];
        let b2 = if i + 1 < data.len() { data[i + 1] } else { 0 };
        let b3 = if i + 2 < data.len() { data[i + 2] } else { 0 };

        let c1 = (b1 >> 2) as usize;
        let c2 = (((b1 & 0x03) << 4) | (b2 >> 4)) as usize;
        let c3 = (((b2 & 0x0f) << 2) | (b3 >> 6)) as usize;
        let c4 = (b3 & 0x3f) as usize;

        result.push(CHARS[c1] as char);
        result.push(CHARS[c2] as char);

        if i + 1 < data.len() {
            result.push(CHARS[c3] as char);
        } else {
            result.push('=');
        }

        if i + 2 < data.len() {
            result.push(CHARS[c4] as char);
        } else {
            result.push('=');
        }

        i += 3;
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64_encode_handles_empty_slice() {
        assert_eq!(base64_encode(&[]), "");
    }

    #[test]
    fn base64_encode_handles_padding_cases() {
        assert_eq!(base64_encode(&[0xFF]), "/w==");
        assert_eq!(base64_encode(&[0xFF, 0xEE]), "/+4=");
        assert_eq!(base64_encode(&[0xFF, 0xEE, 0xDD]), "/+7d");
    }
}
