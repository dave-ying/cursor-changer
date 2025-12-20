import { useToast } from './useToast';

// Context-aware toast hook that provides access to both old and new toast systems
export interface UseToastContextReturn {
  toasts: any[];
  addToast: (text: string, type?: 'info' | 'success' | 'error' | 'warning', options?: any) => string | number;
  removeToast: (id: string | number) => boolean;
  clearToasts: () => void;
  success: (text: string, options?: any) => string | number;
  error: (text: string, options?: any) => string | number;
  warning: (text: string, options?: any) => string | number;
  info: (text: string, options?: any) => string | number;
}

export function useToastContext(): UseToastContextReturn {
  const toastHook = useToast();
  
  // Wrap the new toast system to provide context-style interface
  const addToast = (text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration = 5000) => {
    return toastHook.showToast(text, type, { duration });
  };

  return {
    toasts: toastHook.toasts,
    addToast,
    removeToast: toastHook.removeToast,
    clearToasts: toastHook.clearToasts,
    success: toastHook.success,
    error: toastHook.error,
    warning: toastHook.warning,
    info: toastHook.info
  };
}