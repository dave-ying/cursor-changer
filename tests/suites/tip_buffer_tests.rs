use cursor_changer::{build_tip_buffer, copy_tip_to_buf};

#[test]
fn test_copy_tip_to_buf_normal() {
    let mut buf = [0u16; 128];
    let written = copy_tip_to_buf("Test Message", &mut buf);

    assert!(written > 0);
    assert_eq!(buf[written - 1], 0u16);

    let decoded = crate::common::decode_utf16_without_trailing_nul(&buf[..written]);
    assert_eq!(decoded, "Test Message");
}

#[test]
fn test_copy_tip_to_buf_empty() {
    let mut buf = [0u16; 128];
    let written = copy_tip_to_buf("", &mut buf);

    assert_eq!(written, 1);
    assert_eq!(buf[0], 0u16);
}

#[test]
fn test_copy_tip_to_buf_exact_fit() {
    let mut buf = [0u16; 6]; // "Hello" = 5 chars + NUL
    let written = copy_tip_to_buf("Hello", &mut buf);

    assert_eq!(written, 6);
    assert_eq!(buf[5], 0u16);
}

#[test]
fn test_copy_tip_to_buf_truncates() {
    let mut buf = [0u16; 5];
    let written = copy_tip_to_buf("This is a very long message", &mut buf);

    assert!(written <= buf.len());
}

#[test]
fn test_copy_tip_to_buf_unicode() {
    let mut buf = [0u16; 50];
    let written = copy_tip_to_buf("Hello 世界", &mut buf);

    assert!(written > 0);
    assert_eq!(buf[written - 1], 0u16);
}

#[test]
fn test_copy_tip_to_buf_small_buffer() {
    let mut buf = [0u16; 2];
    let written = copy_tip_to_buf("Long message", &mut buf);

    assert!(written <= 2);
}

#[test]
fn test_build_tip_buffer_size() {
    let buf = build_tip_buffer("Test");
    assert_eq!(buf.len(), 128);
}

#[test]
fn test_build_tip_buffer_content() {
    let buf = build_tip_buffer("Hello World");

    let decoded = crate::common::decode_utf16_until_nul(&buf);
    assert_eq!(decoded, "Hello World");
}

#[test]
fn test_build_tip_buffer_empty() {
    let buf = build_tip_buffer("");
    assert_eq!(buf.len(), 128);
    assert_eq!(buf[0], 0u16);
}

#[test]
fn test_build_tip_buffer_very_long() {
    let long = "a".repeat(200);
    let buf = build_tip_buffer(&long);
    assert_eq!(buf.len(), 128);
}

#[test]
fn test_build_tip_buffer_unicode() {
    let buf = build_tip_buffer("Test 🎯");
    assert_eq!(buf.len(), 128);

    let decoded = crate::common::decode_utf16_until_nul(&buf);
    assert_eq!(decoded, "Test 🎯");
}
