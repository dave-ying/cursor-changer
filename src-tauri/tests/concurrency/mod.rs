mod async_cancellation;
/// Concurrency Property Tests Module
///
/// This module contains tests that validate concurrent operations are handled safely
/// and maintain data integrity under concurrent access patterns.
///
/// The tests are organized into the following submodules:
/// - `cursor_operations`: Tests for concurrent cursor operation serialization
/// - `file_operations`: Tests for overlapping file operation integrity
/// - `async_cancellation`: Tests for async cancellation and cleanup
/// - `rapid_interactions`: Tests for rapid user interaction safety
/// - `unit_tests`: Unit tests for concurrency mechanisms
mod cursor_operations;
mod file_operations;
mod rapid_interactions;
mod unit_tests;
