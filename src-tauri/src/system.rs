#[cfg(test)]
use std::sync::Mutex;
#[cfg(test)]
use std::sync::OnceLock;

#[cfg(test)]
type ApplyMock = Box<dyn FnMut() -> bool + Send + 'static>;
#[cfg(test)]
type ApplyFileMock = Box<dyn FnMut(&str, i32) -> bool + Send + 'static>;
#[cfg(test)]
type ApplySingleMock = Box<dyn FnMut(&str, u32, i32) -> bool + Send + 'static>;

#[cfg(test)]
pub struct MockGuard<'a, T: Send + 'static> {
    mutex: &'a Mutex<Option<T>>,
    prev: Option<T>,
}

#[cfg(test)]
impl<'a, T: Send + 'static> Drop for MockGuard<'a, T> {
    fn drop(&mut self) {
        let mut guard = self.mutex.lock().expect("system mock poisoned");
        *guard = self.prev.take();
    }
}

#[cfg(test)]
fn set_mock_with_guard<'a, T>(lock: &'a OnceLock<Mutex<Option<T>>>, mock: T) -> MockGuard<'a, T>
where
    T: Send + 'static,
{
    let mutex = lock.get_or_init(|| Mutex::new(None));
    let mut guard = mutex.lock().expect("system mock poisoned");
    let prev = std::mem::replace(&mut *guard, Some(mock));
    MockGuard { mutex, prev }
}
#[cfg(test)]
static APPLY_CURSOR_MOCK: OnceLock<Mutex<Option<ApplyMock>>> = OnceLock::new();
#[cfg(test)]
static RESTORE_CURSOR_MOCK: OnceLock<Mutex<Option<ApplyMock>>> = OnceLock::new();
#[cfg(test)]
static APPLY_CURSOR_FILE_WITH_SIZE_MOCK: OnceLock<Mutex<Option<ApplyFileMock>>> = OnceLock::new();
#[cfg(test)]
static APPLY_CURSOR_FROM_FILE_WITH_SIZE_MOCK: OnceLock<Mutex<Option<ApplySingleMock>>> =
    OnceLock::new();

#[cfg(test)]
fn apply_mock(lock: &OnceLock<Mutex<Option<ApplyMock>>>) -> Option<bool> {
    let mutex = lock.get_or_init(|| Mutex::new(None));
    let mut guard = mutex.lock().expect("apply mock poisoned");
    guard.as_mut().map(|f| f())
}

#[cfg(test)]
fn apply_file_mock(
    lock: &OnceLock<Mutex<Option<ApplyFileMock>>>,
    path: &str,
    size: i32,
) -> Option<bool> {
    let mutex = lock.get_or_init(|| Mutex::new(None));
    let mut guard = mutex.lock().expect("apply file mock poisoned");
    guard.as_mut().map(|f| f(path, size))
}

#[cfg(test)]
fn apply_single_mock(
    lock: &OnceLock<Mutex<Option<ApplySingleMock>>>,
    path: &str,
    id: u32,
    size: i32,
) -> Option<bool> {
    let mutex = lock.get_or_init(|| Mutex::new(None));
    let mut guard = mutex.lock().expect("apply single mock poisoned");
    guard.as_mut().map(|f| f(path, id, size))
}

pub fn apply_blank_system_cursors() -> bool {
    #[cfg(test)]
    {
        if let Some(result) = apply_mock(&APPLY_CURSOR_MOCK) {
            return result;
        }
    }

    unsafe { cursor_changer::apply_blank_system_cursors() }
}

pub fn restore_system_cursors() -> bool {
    #[cfg(test)]
    {
        if let Some(result) = apply_mock(&RESTORE_CURSOR_MOCK) {
            return result;
        }
    }

    unsafe { cursor_changer::restore_system_cursors() }
}

pub fn apply_cursor_file_with_size(path: &str, size: i32) -> bool {
    #[cfg(test)]
    {
        if let Some(result) = apply_file_mock(&APPLY_CURSOR_FILE_WITH_SIZE_MOCK, path, size) {
            return result;
        }
    }

    unsafe { cursor_changer::apply_cursor_file_with_size(path, size) }
}

pub fn apply_cursor_from_file_with_size(path: &str, cursor_id: u32, size: i32) -> bool {
    #[cfg(test)]
    {
        if let Some(result) = apply_single_mock(
            &APPLY_CURSOR_FROM_FILE_WITH_SIZE_MOCK,
            path,
            cursor_id,
            size,
        ) {
            return result;
        }
    }

    unsafe { cursor_changer::apply_cursor_from_file_with_size(path, cursor_id, size) }
}

#[cfg(test)]
pub fn set_apply_blank_mock_guard<F>(mock: F) -> MockGuard<'static, ApplyMock>
where
    F: FnMut() -> bool + Send + 'static,
{
    set_mock_with_guard(&APPLY_CURSOR_MOCK, Box::new(mock))
}

#[cfg(test)]
pub fn set_apply_blank_mock<F>(mock: F)
where
    F: FnMut() -> bool + Send + 'static,
{
    let mutex = APPLY_CURSOR_MOCK.get_or_init(|| Mutex::new(None));
    *mutex.lock().expect("apply mock poisoned") = Some(Box::new(mock));
}

#[cfg(test)]
pub fn clear_apply_blank_mock() {
    if let Some(mutex) = APPLY_CURSOR_MOCK.get() {
        *mutex.lock().expect("apply mock poisoned") = None;
    }
}

#[cfg(test)]
pub fn set_restore_mock_guard<F>(mock: F) -> MockGuard<'static, ApplyMock>
where
    F: FnMut() -> bool + Send + 'static,
{
    set_mock_with_guard(&RESTORE_CURSOR_MOCK, Box::new(mock))
}

#[cfg(test)]
pub fn set_restore_mock<F>(mock: F)
where
    F: FnMut() -> bool + Send + 'static,
{
    let mutex = RESTORE_CURSOR_MOCK.get_or_init(|| Mutex::new(None));
    *mutex.lock().expect("restore mock poisoned") = Some(Box::new(mock));
}

#[cfg(test)]
pub fn clear_restore_mock() {
    if let Some(mutex) = RESTORE_CURSOR_MOCK.get() {
        *mutex.lock().expect("apply mock poisoned") = None;
    }
}

#[cfg(test)]
pub fn set_apply_cursor_file_with_size_mock_guard<F>(mock: F) -> MockGuard<'static, ApplyFileMock>
where
    F: FnMut(&str, i32) -> bool + Send + 'static,
{
    set_mock_with_guard(&APPLY_CURSOR_FILE_WITH_SIZE_MOCK, Box::new(mock))
}

#[cfg(test)]
pub fn set_apply_cursor_file_with_size_mock<F>(mock: F)
where
    F: FnMut(&str, i32) -> bool + Send + 'static,
{
    let mutex = APPLY_CURSOR_FILE_WITH_SIZE_MOCK.get_or_init(|| Mutex::new(None));
    *mutex.lock().expect("apply cursor file mock poisoned") = Some(Box::new(mock));
}

#[cfg(test)]
pub fn clear_apply_cursor_file_with_size_mock() {
    if let Some(mutex) = APPLY_CURSOR_FILE_WITH_SIZE_MOCK.get() {
        *mutex.lock().expect("apply cursor file mock poisoned") = None;
    }
}

#[cfg(test)]
pub fn set_apply_cursor_from_file_with_size_mock_guard<F>(
    mock: F,
) -> MockGuard<'static, ApplySingleMock>
where
    F: FnMut(&str, u32, i32) -> bool + Send + 'static,
{
    set_mock_with_guard(&APPLY_CURSOR_FROM_FILE_WITH_SIZE_MOCK, Box::new(mock))
}

#[cfg(test)]
pub fn set_apply_cursor_from_file_with_size_mock<F>(mock: F)
where
    F: FnMut(&str, u32, i32) -> bool + Send + 'static,
{
    let mutex = APPLY_CURSOR_FROM_FILE_WITH_SIZE_MOCK.get_or_init(|| Mutex::new(None));
    *mutex.lock().expect("apply cursor from file mock poisoned") = Some(Box::new(mock));
}

#[cfg(test)]
pub fn clear_apply_cursor_from_file_with_size_mock() {
    if let Some(mutex) = APPLY_CURSOR_FROM_FILE_WITH_SIZE_MOCK.get() {
        *mutex.lock().expect("apply cursor from file mock poisoned") = None;
    }
}
