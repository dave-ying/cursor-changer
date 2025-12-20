//! Binary data writing utilities for cursor conversion
//!
//! This module provides functionality to:
//! - Write binary data in little-endian format
//! - Handle byte-level data manipulation for .CUR file generation

/// Write a u16 value to data in little-endian format
pub fn write_u16(data: &mut Vec<u8>, value: u16) -> Result<(), String> {
    data.extend_from_slice(&value.to_le_bytes());
    Ok(())
}

/// Write a u32 value to data in little-endian format
pub fn write_u32(data: &mut Vec<u8>, value: u32) -> Result<(), String> {
    data.extend_from_slice(&value.to_le_bytes());
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_u16() {
        let mut data = Vec::new();
        write_u16(&mut data, 0x1234).unwrap();
        assert_eq!(data, vec![0x34, 0x12]);
    }

    #[test]
    fn test_write_u32() {
        let mut data = Vec::new();
        write_u32(&mut data, 0x12345678).unwrap();
        assert_eq!(data, vec![0x78, 0x56, 0x34, 0x12]);
    }
}
