import { useState, useEffect } from 'react';
import { toastService } from '../services/toastService';
import { Toast, ToastType, ToastOptions } from '../types/toastTypes';

export interface UseToastReturn {
  toasts: Toast[];
  showToast: (text: string, type?: ToastType, options?: ToastOptions) => string | number;
  removeToast: (id: string | number) => boolean;
  clearToasts: () => void;
  success: (text: string, options?: ToastOptions) => string | number;
  error: (text: string, options?: ToastOptions) => string | number;
  warning: (text: string, options?: ToastOptions) => string | number;
  info: (text: string, options?: ToastOptions) => string | number;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);


  useEffect(() => {
    // Subscribe to toast service changes
    const unsubscribe = toastService.subscribe(() => {
      const currentToasts = toastService.getToasts();
      setToasts(currentToasts);
    });

    // Initial load
    const initialToasts = toastService.getToasts();
    setToasts(initialToasts);

    return unsubscribe;
  }, []);

  const showToast = (text: string, type: ToastType = 'info', options: ToastOptions = {}): string | number => {
    return toastService.show(text, type, options);
  };

  const removeToast = (id: string | number): boolean => {
    return toastService.remove(id);
  };

  const clearToasts = (): void => {
    toastService.clear();
  };

  const success = (text: string, options?: ToastOptions): string | number => {
    return toastService.success(text, options);
  };

  const error = (text: string, options?: ToastOptions): string | number => {
    return toastService.error(text, options);
  };

  const warning = (text: string, options?: ToastOptions): string | number => {
    return toastService.warning(text, options);
  };

  const info = (text: string, options?: ToastOptions): string | number => {
    return toastService.info(text, options);
  };

  return {
    toasts,
    showToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  };
}