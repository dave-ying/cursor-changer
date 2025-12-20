use std::ptr::null_mut;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use winapi::shared::minwindef::{
    BOOL, DWORD, FALSE, HINSTANCE, LPARAM, LRESULT, TRUE, UINT, WPARAM,
};
use winapi::shared::windef::HWND;
use winapi::um::consoleapi::SetConsoleCtrlHandler;
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::shellapi::{
    Shell_NotifyIconW, NIF_MESSAGE, NIF_TIP, NIM_ADD, NIM_DELETE, NOTIFYICONDATAW,
};
use winapi::um::wincon::{CTRL_CLOSE_EVENT, CTRL_C_EVENT, CTRL_LOGOFF_EVENT, CTRL_SHUTDOWN_EVENT};
use winapi::um::winuser::{
    CreateWindowExW, DefWindowProcW, DestroyWindow, DispatchMessageW, GetMessageW,
    GetWindowLongPtrW, MessageBoxW, PostQuitMessage, RegisterClassW, RegisterHotKey,
    SetWindowLongPtrW, TranslateMessage, UnregisterHotKey, GWLP_USERDATA, HWND_MESSAGE, IDYES,
    MB_YESNO, MOD_CONTROL, MOD_SHIFT, MSG, WM_APP, WM_DESTROY, WM_ENDSESSION, WM_HOTKEY,
    WM_LBUTTONUP, WM_RBUTTONUP, WNDCLASSW,
};

use crate::win_common::{build_tip_buffer, to_wide};
use crate::win_cursor::{
    apply_blank_system_cursors, perform_toggle, restore_system_cursors, SystemApi,
};

const WM_TRAY_ICON: UINT = WM_APP + 1;
const HOTKEY_ID: i32 = 1;

static HIDDEN_STATE: std::sync::OnceLock<Arc<AtomicBool>> = std::sync::OnceLock::new();

fn restore_cursor_if_hidden(hidden: &Arc<AtomicBool>, context: &str) {
    if hidden.load(Ordering::SeqCst) {
        unsafe {
            if restore_system_cursors() {
                hidden.store(false, Ordering::SeqCst);
            } else {
                eprintln!("Failed to restore system cursors ({context})");
            }
        }
    }
}

fn restore_cursor_from_global(context: &str) {
    if let Some(hidden) = HIDDEN_STATE.get() {
        restore_cursor_if_hidden(hidden, context);
    }
}

unsafe extern "system" fn console_handler(ctrl_type: DWORD) -> BOOL {
    match ctrl_type {
        CTRL_C_EVENT | CTRL_CLOSE_EVENT | CTRL_LOGOFF_EVENT | CTRL_SHUTDOWN_EVENT => {
            restore_cursor_from_global("console control signal");
        }
        _ => {}
    }
    FALSE
}

struct RealSystemApi;

impl SystemApi for RealSystemApi {
    fn apply_blank_system_cursors(&mut self) -> bool {
        unsafe { apply_blank_system_cursors() }
    }

    fn restore_system_cursors(&mut self) -> bool {
        unsafe { restore_system_cursors() }
    }
}

fn toggle_cursor(hidden: &Arc<AtomicBool>) {
    let mut api = RealSystemApi;
    let currently_hidden = hidden.load(Ordering::SeqCst);
    let (ok, new_hidden) = perform_toggle(&mut api, currently_hidden);
    if ok {
        hidden.store(new_hidden, Ordering::SeqCst);
    } else if currently_hidden && !ok {
        eprintln!("Failed to perform toggle operation");
    }
}

unsafe extern "system" fn wndproc(
    hwnd: HWND,
    msg: UINT,
    wparam: WPARAM,
    lparam: LPARAM,
) -> LRESULT {
    match msg {
        WM_HOTKEY => {
            #[allow(clippy::cast_possible_truncation, clippy::cast_possible_wrap)]
            if wparam as i32 == HOTKEY_ID {
                let ptr = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut Arc<AtomicBool>;
                if !ptr.is_null() {
                    toggle_cursor(&*ptr);
                }
            }
            0
        }
        WM_TRAY_ICON => {
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            if lparam as UINT == WM_RBUTTONUP as UINT || lparam as UINT == WM_LBUTTONUP as UINT {
                let title = to_wide("cursor changer");
                let text = to_wide("Exit application?");
                let res = MessageBoxW(hwnd, text.as_ptr(), title.as_ptr(), MB_YESNO);
                if res == IDYES {
                    DestroyWindow(hwnd);
                }
            }
            0
        }
        WM_ENDSESSION => {
            if wparam != 0 {
                let ptr = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut Arc<AtomicBool>;
                if ptr.is_null() {
                    restore_cursor_from_global("during session end");
                } else {
                    restore_cursor_if_hidden(&*ptr, "during session end");
                }
            }
            0
        }
        WM_DESTROY => {
            UnregisterHotKey(hwnd, HOTKEY_ID);
            let ptr = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *mut Arc<AtomicBool>;
            if !ptr.is_null() {
                restore_cursor_if_hidden(&*ptr, "during window destroy");
                let _boxed: Box<Arc<AtomicBool>> = Box::from_raw(ptr);
            }
            PostQuitMessage(0);
            0
        }
        _ => DefWindowProcW(hwnd, msg, wparam, lparam),
    }
}

/// Run the Windows message loop and application lifecycle.
///
/// # Errors
/// Returns an Err(String) on early failures (e.g. window creation failed).
///
/// # Panics
/// May panic if mutex locks are poisoned during panic handling.
pub fn run_app() -> Result<(), String> {
    let hidden = Arc::new(AtomicBool::new(false));
    let _ = HIDDEN_STATE.set(hidden.clone());

    {
        let panic_hidden = hidden.clone();
        std::panic::set_hook(Box::new(move |panic_info| {
            restore_cursor_if_hidden(&panic_hidden, "during panic");
            eprintln!("Application panicked: {panic_info}");
        }));
    }

    unsafe {
        if SetConsoleCtrlHandler(Some(console_handler), TRUE) == 0 {
            eprintln!("Failed to install console control handler");
        }
    }

    unsafe {
        let hinstance: HINSTANCE = GetModuleHandleW(null_mut());

        let class_name = to_wide("CursorChangerWindowClass");

        let wc = WNDCLASSW {
            style: 0,
            lpfnWndProc: Some(wndproc),
            cbClsExtra: 0,
            cbWndExtra: 0,
            hInstance: hinstance,
            hIcon: null_mut(),
            hCursor: null_mut(),
            hbrBackground: null_mut(),
            lpszMenuName: null_mut(),
            lpszClassName: class_name.as_ptr(),
        };

        RegisterClassW(&raw const wc);

        let window_name = to_wide("CursorChanger");
        let hwnd = CreateWindowExW(
            0,
            class_name.as_ptr(),
            window_name.as_ptr(),
            0,
            0,
            0,
            0,
            0,
            HWND_MESSAGE,
            null_mut(),
            hinstance,
            null_mut(),
        );

        if hwnd.is_null() {
            return Err("Failed to create window".into());
        }

        // Ctrl + Shift + C
        #[allow(clippy::cast_possible_truncation)]
        if RegisterHotKey(
            hwnd,
            HOTKEY_ID,
            u32::try_from(MOD_CONTROL | MOD_SHIFT).unwrap_or(0),
            u32::from('C'),
        ) == 0
        {
            eprintln!("Failed to register hotkey");
        }

        let mut nid: NOTIFYICONDATAW = std::mem::zeroed();
        #[allow(clippy::cast_possible_truncation)]
        {
            nid.cbSize = std::mem::size_of::<NOTIFYICONDATAW>() as DWORD;
        }
        nid.hWnd = hwnd;
        nid.uID = 1;
        nid.uFlags = NIF_MESSAGE | NIF_TIP;
        nid.uCallbackMessage = WM_TRAY_ICON;
        let buf = build_tip_buffer("cursor changer");
        for (i, &c) in buf.iter().enumerate().take(nid.szTip.len()) {
            nid.szTip[i] = c;
        }

        if Shell_NotifyIconW(NIM_ADD, &raw mut nid) == 0 {
            eprintln!("Failed to add tray icon");
        }

        SetWindowLongPtrW(
            hwnd,
            GWLP_USERDATA,
            Box::into_raw(Box::new(hidden.clone())) as isize,
        );

        let mut msg: MSG = std::mem::zeroed();
        while GetMessageW(&raw mut msg, null_mut(), 0, 0) > 0 {
            TranslateMessage(&raw const msg);
            DispatchMessageW(&raw const msg);
        }

        restore_cursor_if_hidden(&hidden, "after message loop");
        Shell_NotifyIconW(NIM_DELETE, &raw mut nid);
    }

    Ok(())
}
