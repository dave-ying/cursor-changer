import * as React from 'react';

import { logger } from '@/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  name?: string;
  showDetails?: boolean;
  enableRetry?: boolean;
  fallback?: React.ComponentType<{ error: Error | null }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error Boundary Component for React
 * Catches JavaScript errors anywhere in child component tree,
 * displays a fallback UI, and logs the error via the logger utility.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: Date.now()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      error,
      errorId: Date.now()
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console with enhanced details
    logger.error('[ErrorBoundary] Component error caught:', {
      error: error?.message || error,
      stack: error?.stack || 'No stack trace available',
      componentStack: errorInfo?.componentStack || 'No component stack available',
      errorBoundary: this.props.name || 'Unnamed ErrorBoundary',
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Optional: Send error to error reporting service
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (reportingError) {
        logger.error('[ErrorBoundary] Error reporting failed:', reportingError);
      }
    }
  }

  override render() {
    if (this.state.hasError) {
      // Customize fallback UI based on props
      const { 
        fallback: CustomFallback, 
        showDetails = false,
        enableRetry = true,
        name = 'Component'
      } = this.props;

      // Default fallback UI
      const DefaultFallback = () => (
        <div className="error-boundary-fallback p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-red-500 text-xl">⚠️</span>
            <h3 className="text-red-800 font-semibold">
              {name} Error
            </h3>
          </div>
          
          <p className="text-red-700 text-sm mb-3">
            Something went wrong while rendering this component.
          </p>
          
          {showDetails && this.state.error && (
            <details className="mb-3">
              <summary className="text-red-600 text-xs hover:text-red-800">
                Technical Details
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-32">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          {enableRetry && (
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      );

      return CustomFallback ? <CustomFallback error={this.state.error} /> : <DefaultFallback />;
    }

    return this.props.children;
  }
}

/**
 * HOC for easier error boundary wrapping
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
}

/**
 * Hook for error boundary fallbacks (for functional components)
 */
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo: object = {}) => {
    logger.error('[useErrorHandler] Manual error report:', {
      error,
      errorInfo,
      timestamp: new Date().toISOString()
    });
  }, []);
}
