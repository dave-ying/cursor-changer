use std::ffi::OsStr;
use std::iter::once;
use std::os::windows::ffi::OsStrExt;

#[must_use]
pub fn to_wide(s: &str) -> Vec<u16> {
    OsStr::new(s).encode_wide().chain(once(0)).collect()
}

/// Copy a UTF-8 `tip` into a provided UTF-16 `dest` buffer (typically a fixed-size
/// `NOTIFYICONDATAW::szTip` buffer). Returns the number of 16-bit words written
/// (including the terminating NUL if it fit).
pub fn copy_tip_to_buf(tip: &str, dest: &mut [u16]) -> usize {
    let wide = to_wide(tip);
    let mut written = 0usize;
    for (i, v) in wide.iter().enumerate() {
        if i >= dest.len() {
            break;
        }
        dest[i] = *v;
        written += 1;
        // stop early if we wrote the terminating NUL
        if *v == 0u16 {
            break;
        }
    }
    written
}

/// Build a fixed-size tip buffer for a tray icon.
///
/// Historically `NOTIFYICONDATAW::szTip` is 128 WCHARs; return a Vec<u16> sized to that
/// and populated with the wide tip (including terminating NUL if it fits).
#[must_use]
pub fn build_tip_buffer(tip: &str) -> Vec<u16> {
    const SZ_TIP: usize = 128;
    let mut buf = vec![0u16; SZ_TIP];
    let _ = copy_tip_to_buf(tip, &mut buf);
    buf
}
