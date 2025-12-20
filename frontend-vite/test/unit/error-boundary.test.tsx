/**
 * Unit tests for Error Boundary component
 * Tests React error boundaries catch component errors
 * 
 * Requirements: 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary, withErrorBoundary, useErrorHandler } from '@/components/ui/error-boundary';
import React from 'react';

// Component that throws an error
const ThrowError = ({ shouldThrow = true, message = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

// Component that works fine
const WorkingComponent = () => <div>Working component</div>;

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for these tests since we're intentionally throwing errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <WorkingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should catch errors thrown by child components', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should show error fallback UI
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should display custom error boundary name', () => {
    render(
      <ErrorBoundary name="TestComponent">
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/TestComponent Error/i)).toBeInTheDocument();
  });

  it('should display default name when no name provided', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Component Error/i)).toBeInTheDocument();
  });

  it('should show error details when showDetails is true', () => {
    render(
      <ErrorBoundary showDetails={true}>
        <ThrowError message="Detailed test error" />
      </ErrorBoundary>
    );

    // Should have a details element
    const details = screen.getByText('Technical Details');
    expect(details).toBeInTheDocument();
  });

  it('should hide error details when showDetails is false', () => {
    render(
      <ErrorBoundary showDetails={false}>
        <ThrowError />
      </ErrorBoundary>
    );

    // Should not have technical details
    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
  });

  it('should show retry button when enableRetry is true', () => {
    render(
      <ErrorBoundary enableRetry={true}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('should hide retry button when enableRetry is false', () => {
    render(
      <ErrorBoundary enableRetry={false}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByRole('button', { name: /Try Again/i })).not.toBeInTheDocument();
  });

  it('should reset error state when retry button is clicked', async () => {
    const user = userEvent.setup();
    
    // Use a ref to track if we should throw - this persists across re-renders
    let shouldThrow = true;
    
    // Component that throws on first render but not after retry
    const ToggleError = () => {
      if (shouldThrow) {
        throw new Error('Temporary error');
      }
      return <div>Component recovered</div>;
    };

    render(
      <ErrorBoundary enableRetry={true}>
        <ToggleError />
      </ErrorBoundary>
    );

    // Should show error initially
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Fix the component before clicking retry
    shouldThrow = false;

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /Try Again/i });
    await user.click(retryButton);

    // Should show recovered component
    expect(screen.getByText('Component recovered')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError message="Callback test error" />
      </ErrorBoundary>
    );

    // onError should have been called
    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Callback test error' }),
      expect.any(Object)
    );
  });

  it('should handle onError callback errors gracefully', () => {
    const onError = vi.fn(() => {
      throw new Error('Callback error');
    });

    // Should not throw even if callback throws
    expect(() => {
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError />
        </ErrorBoundary>
      );
    }).not.toThrow();

    // Should still show error UI
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should render custom fallback component when provided', () => {
    const CustomFallback = ({ error }) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError message="Custom fallback test" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Custom error: Custom fallback test/i)).toBeInTheDocument();
  });

  it('should log error to console', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');

    render(
      <ErrorBoundary>
        <ThrowError message="Console log test" />
      </ErrorBoundary>
    );

    // Should have logged the error
    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedError = consoleErrorSpy.mock.calls.find(call => 
      call[0] === '[ErrorBoundary] Component error caught:' ||
      call[1] === '[ErrorBoundary] Component error caught:'
    );
    expect(loggedError).toBeDefined();
  });

  it('should handle multiple errors from different children', () => {
    const MultipleErrors = () => (
      <>
        <ThrowError message="First error" />
        <ThrowError message="Second error" />
      </>
    );

    render(
      <ErrorBoundary>
        <MultipleErrors />
      </ErrorBoundary>
    );

    // Should catch the first error and show fallback
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });

  it('should isolate errors to specific error boundary', () => {
    render(
      <div>
        <ErrorBoundary name="Boundary1">
          <ThrowError />
        </ErrorBoundary>
        <ErrorBoundary name="Boundary2">
          <WorkingComponent />
        </ErrorBoundary>
      </div>
    );

    // First boundary should show error
    expect(screen.getByText(/Boundary1 Error/i)).toBeInTheDocument();
    
    // Second boundary should still work
    expect(screen.getByText('Working component')).toBeInTheDocument();
  });
});

describe('withErrorBoundary HOC', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(WorkingComponent);

    render(<WrappedComponent />);

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should catch errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowError, { name: 'WrappedTest' });

    render(<WrappedComponent />);

    expect(screen.getByText(/WrappedTest Error/i)).toBeInTheDocument();
  });

  it('should pass props to wrapped component', () => {
    const PropsComponent = ({ message }) => <div>{message}</div>;
    const WrappedComponent = withErrorBoundary(PropsComponent);

    render(<WrappedComponent message="Test message" />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should set display name correctly', () => {
    const TestComponent = () => <div>Test</div>;
    TestComponent.displayName = 'TestComponent';
    
    const WrappedComponent = withErrorBoundary(TestComponent);

    expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
  });
});

describe('useErrorHandler hook', () => {
  it('should provide error handler function', () => {
    let errorHandler;
    const TestComponent = () => {
      errorHandler = useErrorHandler();
      return <div>Test</div>;
    };

    render(<TestComponent />);

    expect(typeof errorHandler).toBe('function');
  });

  it('should log errors when called', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    let errorHandler;
    const TestComponent = () => {
      errorHandler = useErrorHandler();
      return <div>Test</div>;
    };

    render(<TestComponent />);

    const testError = new Error('Manual error');
    errorHandler(testError);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR]',
      '[useErrorHandler] Manual error report:',
      expect.objectContaining({
        error: testError
      })
    );
  });
});
