import * as React from 'react';
import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';

type ToastType = 'info' | 'success' | 'error' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: (id: string) => void;
}

export function Toast({ id, message, type = 'info', duration = 5000, onClose }: ToastProps) {
  const clearMessage = useAppStore((s) => s.clearMessage);

  const handleClose = () => {
    if (onClose) {
      onClose(id);
    } else {
      clearMessage();
    }
  };

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, handleClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 13 4 4L19 7"/>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 18 6.94-6.94M18 6 6.06 18"/>
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        );
      default: // info
        return (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        );
    }
  };

  return (
    <div
      className={`toast-container toast--${type}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-current" style={{ color: 'var(--text-primary)' }}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {message}
        </div>
        <button
          type="button"
          className="flex-shrink-0 ml-2 p-1 rounded-md transition-colors duration-200 hover:bg-transparent"
          style={{
            color: 'var(--text-muted)',
            backgroundColor: 'transparent'
          }}
          onClick={handleClose}
          aria-label="Close"
        >
          <span className="sr-only">Close</span>
          <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

interface ToastData {
  id: string;
  text: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts?: ToastData[];
  onClose?: (id: string) => void;
}

export function ToastContainer({ toasts = [], onClose }: ToastContainerProps) {
  return (
    <div className="toast-wrapper">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.text}
          type={toast.type}
          duration={toast.duration}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
