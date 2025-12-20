# Frontend Regression Tests

This directory contains regression tests for previously fixed frontend bugs. Each test ensures that a bug, once fixed, does not reappear in future code changes.

## Purpose

Regression tests serve to:
- Prevent fixed bugs from being reintroduced
- Document historical issues and their fixes
- Provide confidence during refactoring
- Build a comprehensive test suite over time

## Organization

Each regression test file should be named descriptively to indicate the bug it tests:
- `issue-NNN-description.test.jsx` - For GitHub/issue tracker issues
- `bug-YYYY-MM-DD-description.test.jsx` - For bugs without issue numbers
- `regression-feature-description.test.jsx` - For feature-specific regressions

## Test Template

Use the following template for all regression tests:

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Regression test for [Issue #NNN / Bug description]
 * 
 * **Original Issue:**
 * [Detailed description of the bug, including symptoms and impact]
 * 
 * **Steps to Reproduce:**
 * 1. [Step 1]
 * 2. [Step 2]
 * 3. [Step 3]
 * 
 * **Expected Behavior:**
 * [What should happen]
 * 
 * **Actual Behavior (before fix):**
 * [What was happening]
 * 
 * **Fixed in:** [Commit hash or PR number]
 * **Date Fixed:** [YYYY-MM-DD]
 * 
 * **Test Verification:**
 * This test verifies that [specific aspect being tested].
 */
describe('Regression: Issue #NNN - Description', () => {
  beforeEach(() => {
    // Setup test environment
  });

  afterEach(() => {
    // Cleanup
  });

  it('should [specific behavior being tested]', async () => {
    // Arrange: Set up test conditions that trigger the bug
    
    // Act: Perform the operation that previously caused the bug
    
    // Assert: Verify the bug is fixed
  });
});
```

## Writing Regression Tests

### 1. Document the Bug Thoroughly
Include all relevant information about the original bug:
- Issue number or bug report reference
- Detailed description of the problem
- Steps to reproduce
- Expected vs actual behavior
- When and how it was fixed

### 2. Test the Specific Bug
Focus the test on the exact scenario that caused the bug:
- Use minimal setup to reproduce the issue
- Test the specific edge case or condition
- Avoid testing unrelated functionality

### 3. Make Tests Maintainable
- Use clear, descriptive names
- Keep tests simple and focused
- Add comments explaining non-obvious aspects
- Use helper functions for common setup

### 4. Ensure Tests Are Reliable
- Tests should pass consistently
- Avoid flaky tests (timing-dependent, random failures)
- Use deterministic test data
- Clean up resources properly (event listeners, timers, etc.)

## Running Regression Tests

Run all regression tests:
```bash
npm test -- test/regression
```

Run a specific regression test:
```bash
npm test -- test/regression/issue-123-description.test.jsx
```

Run with coverage:
```bash
npm run test:coverage -- test/regression
```

## Integration with CI

All regression tests run automatically on every commit as part of the CI pipeline. A failing regression test indicates that a previously fixed bug has been reintroduced and must be addressed before merging.

## Adding New Regression Tests

When fixing a bug:

1. **Before fixing:** Write a failing test that reproduces the bug
2. **Fix the bug:** Implement the fix in the codebase
3. **Verify:** Ensure the test now passes
4. **Document:** Add complete documentation to the test
5. **Commit:** Include the test with the bug fix commit

This ensures every bug fix is accompanied by a test that prevents regression.

## Testing Best Practices

### Component Testing
- Render components in isolation when possible
- Use `@testing-library/react` for user-centric testing
- Test user interactions, not implementation details

### Async Operations
- Use `waitFor` for async state updates
- Mock Tauri API calls appropriately
- Clean up pending promises in afterEach

### State Management
- Test state changes through user interactions
- Verify UI updates reflect state changes
- Test edge cases in state transitions

### Event Listeners
- Verify event listeners are registered
- Test event handler behavior
- Ensure cleanup in component unmount

## Examples

See existing regression tests in this directory for examples of well-documented regression tests.

## Maintenance

- Review regression tests periodically to ensure they remain relevant
- Update tests if the underlying implementation changes significantly
- Remove tests only if the feature they test is completely removed
- Keep documentation up to date with current codebase structure
