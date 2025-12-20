use super::constants::{
    OCR_APPSTARTING, OCR_CROSS, OCR_HAND, OCR_HELP, OCR_IBEAM, OCR_NO, OCR_NORMAL, OCR_PEN,
    OCR_SIZEALL, OCR_SIZENESW, OCR_SIZENS, OCR_SIZENWSE, OCR_SIZEWE, OCR_UP, OCR_WAIT,
};

/// Metadata for a customizable cursor type
#[derive(Debug, Clone, Copy)]
pub struct CursorType {
    pub id: u32,
    pub name: &'static str,
    pub registry_key: &'static str,
    pub display_name: &'static str,
}

pub const CURSOR_TYPES: [CursorType; 15] = [
    CursorType {
        id: OCR_NORMAL,
        name: "Normal",
        registry_key: "Arrow",
        display_name: "Normal select",
    },
    CursorType {
        id: OCR_IBEAM,
        name: "IBeam",
        registry_key: "IBeam",
        display_name: "Text select",
    },
    CursorType {
        id: OCR_HAND,
        name: "Hand",
        registry_key: "Hand",
        display_name: "Link select",
    },
    CursorType {
        id: OCR_WAIT,
        name: "Wait",
        registry_key: "Wait",
        display_name: "Busy",
    },
    CursorType {
        id: OCR_SIZENS,
        name: "SizeNS",
        registry_key: "SizeNS",
        display_name: "Vertical resize",
    },
    CursorType {
        id: OCR_SIZEWE,
        name: "SizeWE",
        registry_key: "SizeWE",
        display_name: "Horizontal resize",
    },
    CursorType {
        id: OCR_SIZENWSE,
        name: "SizeNWSE",
        registry_key: "SizeNWSE",
        display_name: "Diagonal resize 1",
    },
    CursorType {
        id: OCR_SIZENESW,
        name: "SizeNESW",
        registry_key: "SizeNESW",
        display_name: "Diagonal resize 2",
    },
    CursorType {
        id: OCR_SIZEALL,
        name: "SizeAll",
        registry_key: "SizeAll",
        display_name: "Move",
    },
    CursorType {
        id: OCR_HELP,
        name: "Help",
        registry_key: "Help",
        display_name: "Help select",
    },
    CursorType {
        id: OCR_NO,
        name: "No",
        registry_key: "No",
        display_name: "Unavailable",
    },
    CursorType {
        id: OCR_APPSTARTING,
        name: "AppStarting",
        registry_key: "AppStarting",
        display_name: "Working in background",
    },
    CursorType {
        id: OCR_UP,
        name: "Up",
        registry_key: "UpArrow",
        display_name: "Alternate select",
    },
    CursorType {
        id: OCR_CROSS,
        name: "Cross",
        registry_key: "Cross",
        display_name: "Precision select",
    },
    CursorType {
        id: OCR_PEN,
        name: "Pen",
        registry_key: "Pen",
        display_name: "Pen",
    },
];
