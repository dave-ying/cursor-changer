import { TOAST_DEFAULTS } from '../constants/toastConstants';
import { Toast, ToastType, ToastOptions } from '../types/toastTypes';
import { logger } from '../utils/logger';

export class ToastService {
  private static instance: ToastService;
  private toasts: Toast[] = [];
  private listeners: Set<() => void> = new Set();

  private constructor() {}

  static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  // Subscribe to toast changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Get current toasts
  getToasts(): Toast[] {
    return [...this.toasts];
  }

  // Add a new toast
  show(text: string, type: ToastType = 'info', options: ToastOptions = {}): string | number {
    try {
      const id = Date.now() + Math.random();
      const toast: Toast = {
        id,
        text,
        type,
        duration: options.duration ?? TOAST_DEFAULTS.DURATION,
        position: options.position ?? TOAST_DEFAULTS.POSITION
      };

      // Add toast to the beginning of the array
      this.toasts = [toast, ...this.toasts];

      // Limit number of toasts
      if (this.toasts.length > TOAST_DEFAULTS.MAX_TOASTS) {
        this.toasts = this.toasts.slice(0, TOAST_DEFAULTS.MAX_TOASTS);
      }

      // Set up auto-dismiss if duration > 0
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          this.remove(id);
        }, toast.duration);
      }

      this.notifyListeners();
      return id;
    } catch (error) {
      logger.error('ToastService: Failed to show toast:', error);
      return -1;
    }
  }

  // Remove a specific toast
  remove(id: string | number): boolean {
    try {
      const initialLength = this.toasts.length;
      this.toasts = this.toasts.filter(toast => toast.id !== id);
      
      if (this.toasts.length !== initialLength) {
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('ToastService: Failed to remove toast:', error);
      return false;
    }
  }

  // Clear all toasts
  clear(): void {
    try {
      this.toasts = [];
      this.notifyListeners();
    } catch (error) {
      logger.error('ToastService: Failed to clear toasts:', error);
    }
  }

  // Convenience methods for different types
  success(text: string, options?: ToastOptions): string | number {
    return this.show(text, 'success', options);
  }

  error(text: string, options?: ToastOptions): string | number {
    return this.show(text, 'error', options);
  }

  warning(text: string, options?: ToastOptions): string | number {
    return this.show(text, 'warning', options);
  }

  info(text: string, options?: ToastOptions): string | number {
    return this.show(text, 'info', options);
  }
}

// Export singleton instance
export const toastService = ToastService.getInstance();