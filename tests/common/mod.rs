pub fn decode_utf16_without_trailing_nul(buf: &[u16]) -> String {
    let slice = match buf.last() {
        Some(0u16) if buf.len() > 1 => &buf[..buf.len() - 1],
        Some(0u16) => &[],
        _ => buf,
    };

    String::from_utf16(slice).expect("valid UTF-16")
}

pub fn decode_utf16_until_nul(buf: &[u16]) -> String {
    let nul_pos = buf.iter().position(|&c| c == 0u16).unwrap_or(buf.len());
    String::from_utf16(&buf[..nul_pos]).expect("valid UTF-16")
}

pub const ALL_CURSOR_NAMES: [&str; 15] = [
    "Normal",
    "IBeam",
    "Hand",
    "Wait",
    "SizeNS",
    "SizeWE",
    "SizeNWSE",
    "SizeNESW",
    "SizeAll",
    "Help",
    "No",
    "AppStarting",
    "Up",
    "Cross",
    "Pen",
];
