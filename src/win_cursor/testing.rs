#[cfg(test)]
use std::sync::{Mutex, OnceLock};

#[cfg(test)]
pub(crate) static TEST_CURSOR_REGISTRY_PATH: OnceLock<Mutex<Option<String>>> = OnceLock::new();

#[cfg(test)]
pub(crate) type RefreshCursorMock = Box<dyn FnMut() -> bool + Send + 'static>;

#[cfg(test)]
pub(crate) static REFRESH_CURSOR_SETTINGS_MOCK: OnceLock<Mutex<Option<RefreshCursorMock>>> =
    OnceLock::new();

#[cfg(test)]
/// # Panics
/// May panic if the test registry mutex is poisoned.
pub fn set_test_cursor_registry_path(path: Option<String>) {
    let lock = TEST_CURSOR_REGISTRY_PATH.get_or_init(|| Mutex::new(None));
    *lock.lock().expect("test registry mutex poisoned") = path;
}

#[cfg(test)]
/// # Panics
/// May panic if the mock mutex is poisoned.
pub fn set_refresh_cursor_settings_mock<F>(mock: F)
where
    F: FnMut() -> bool + Send + 'static,
{
    let lock = REFRESH_CURSOR_SETTINGS_MOCK.get_or_init(|| Mutex::new(None));
    *lock.lock().expect("refresh cursor settings mock poisoned") = Some(Box::new(mock));
}

#[cfg(test)]
/// # Panics
/// May panic if the mock mutex is poisoned.
pub fn clear_refresh_cursor_settings_mock() {
    if let Some(lock) = REFRESH_CURSOR_SETTINGS_MOCK.get() {
        *lock.lock().expect("refresh cursor settings mock poisoned") = None;
    }
}
