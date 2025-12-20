use cursor_changer::to_wide;

#[test]
fn test_to_wide_ascii() {
    let result = to_wide("Hello");
    assert_eq!(result.last(), Some(&0u16));

    // Decode without NUL
    let decoded = crate::common::decode_utf16_without_trailing_nul(&result);
    assert_eq!(decoded, "Hello");
}

#[test]
fn test_to_wide_unicode() {
    let orig = "Hello 世界 🎯";
    let result = to_wide(orig);
    assert_eq!(result.last(), Some(&0u16));

    let decoded = crate::common::decode_utf16_without_trailing_nul(&result);
    assert_eq!(decoded, orig);
}

#[test]
fn test_to_wide_empty() {
    let result = to_wide("");
    assert_eq!(result, vec![0u16]);
}

#[test]
fn test_to_wide_special_chars() {
    let orig = "Test\n\r\t\0";
    let result = to_wide(orig);
    assert_eq!(result.last(), Some(&0u16));
}

#[test]
fn test_to_wide_long_string() {
    let long = "a".repeat(10000);
    let result = to_wide(&long);
    assert_eq!(result.len(), 10001); // 10000 chars + NUL
    assert_eq!(result.last(), Some(&0u16));
}

#[test]
fn test_to_wide_with_emojis() {
    let orig = "Test 😀 😁 😂";
    let result = to_wide(orig);
    assert_eq!(result.last(), Some(&0u16));

    let decoded = crate::common::decode_utf16_without_trailing_nul(&result);
    assert_eq!(decoded, orig);
}
