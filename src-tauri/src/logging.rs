#[macro_export]
macro_rules! cc_debug {
    ($($arg:tt)*) => {{
        if cfg!(debug_assertions) {
            println!($($arg)*);
        }
    }};
}

#[macro_export]
macro_rules! cc_debug_if {
    ($cond:expr, $($arg:tt)*) => {{
        if $cond {
            println!($($arg)*);
        }
    }};
}

#[macro_export]
macro_rules! cc_info {
    ($($arg:tt)*) => {{
        println!($($arg)*);
    }};
}

#[macro_export]
macro_rules! cc_warn {
    ($($arg:tt)*) => {{
        eprintln!($($arg)*);
    }};
}

#[macro_export]
macro_rules! cc_warn_if {
    ($cond:expr, $($arg:tt)*) => {{
        if $cond {
            eprintln!($($arg)*);
        }
    }};
}

#[macro_export]
macro_rules! cc_error {
    ($($arg:tt)*) => {{
        eprintln!($($arg)*);
    }};
}
