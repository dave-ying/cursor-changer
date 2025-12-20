#[macro_export]
macro_rules! test_log {
    ($($arg:tt)*) => {
        if std::env::var("TEST_LOG").is_ok() {
            println!($($arg)*);
        }
    };
}
