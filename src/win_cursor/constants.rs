pub(crate) const CURSOR_DIMENSION: i32 = 32;
pub(crate) const CURSOR_PLANE_BYTES: usize =
    (CURSOR_DIMENSION as usize / 8) * (CURSOR_DIMENSION as usize);

pub(crate) const OCR_NORMAL: u32 = 32512;
pub(crate) const OCR_IBEAM: u32 = 32513;
pub(crate) const OCR_WAIT: u32 = 32514;
pub(crate) const OCR_CROSS: u32 = 32515;
pub(crate) const OCR_UP: u32 = 32516;
pub(crate) const OCR_SIZENWSE: u32 = 32642;
pub(crate) const OCR_SIZENESW: u32 = 32643;
pub(crate) const OCR_SIZEWE: u32 = 32644;
pub(crate) const OCR_SIZENS: u32 = 32645;
pub(crate) const OCR_SIZEALL: u32 = 32646;
pub(crate) const OCR_NO: u32 = 32648;
pub(crate) const OCR_HAND: u32 = 32649;
pub(crate) const OCR_APPSTARTING: u32 = 32650;
pub(crate) const OCR_HELP: u32 = 32651;
pub(crate) const OCR_PEN: u32 = 32631;

pub(crate) const CURSOR_IDS: [u32; 15] = [
    OCR_NORMAL,
    OCR_IBEAM,
    OCR_WAIT,
    OCR_CROSS,
    OCR_UP,
    OCR_SIZENWSE,
    OCR_SIZENESW,
    OCR_SIZEWE,
    OCR_SIZENS,
    OCR_SIZEALL,
    OCR_NO,
    OCR_HAND,
    OCR_APPSTARTING,
    OCR_HELP,
    OCR_PEN,
];
