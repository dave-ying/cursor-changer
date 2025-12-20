/// Concurrency Property Tests
///
/// This file serves as the entry point for all concurrency-related tests.
/// The tests have been refactored into a modular structure for better organization.
///
/// See the `concurrency/` module for the actual test implementations:
/// - `cursor_operations`: Concurrent cursor operation serialization tests
/// - `file_operations`: Overlapping file operation integrity tests
/// - `async_cancellation`: Async cancellation and cleanup tests
/// - `rapid_interactions`: Rapid user interaction safety tests
/// - `unit_tests`: Unit tests for concurrency mechanisms

#[path = "concurrency/mod.rs"]
mod concurrency;
