import React, { useEffect, useRef } from 'react';
import { ToastContainer } from './toast/ToastContainer';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../utils/logger';

export interface GlobalToastProviderProps {
  children?: React.ReactNode;
}

// Error boundary for toast components
class ToastErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Toast Error Boundary caught an error:', error, errorInfo);
    this.props.onError(error);
  }

  override render() {
    if (this.state.hasError) {
      return null; // Silently fail - toast system should not break the app
    }

    return this.props.children;
  }
}

export function GlobalToastProvider({ children }: GlobalToastProviderProps) {
  const { toasts } = useToast();

  const handleToastError = (error: Error) => {
    logger.error('Toast system error:', error);
  };

  // Show toast container only if there are toasts
  const shouldShowToast = toasts && toasts.length > 0;

  const prevToastLengthRef = useRef<number | undefined>(undefined);
  const prevShouldShowToastRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const toastLength = toasts?.length ?? 0;

    if (prevToastLengthRef.current !== toastLength) {
      logger.debug('[GlobalToastProvider] Toasts changed. toasts.length:', toastLength);
      prevToastLengthRef.current = toastLength;
    }

    if (prevShouldShowToastRef.current !== shouldShowToast) {
      logger.debug('[GlobalToastProvider] Should show toast:', shouldShowToast);
      prevShouldShowToastRef.current = shouldShowToast;
    }
  }, [toasts, shouldShowToast]);

  return (
    <>
      {children}
      
      {shouldShowToast && (
        <ToastErrorBoundary onError={handleToastError}>
          <ToastContainer />
        </ToastErrorBoundary>
      )}
    </>
  );
}