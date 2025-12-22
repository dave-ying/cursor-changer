import { TOAST_DEFAULTS } from '../constants/toastConstants';
import { Toast, ToastType, ToastOptions } from '../types/toastTypes';
import { logger } from '../utils/logger';

export class ToastService {
  private static instance: ToastService;
  private toasts: Toast[] = [];
  private timeouts: Map<string | number, ReturnType<typeof setTimeout>> = new Map();
  private expirations: Map<string | number, number> = new Map();
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
    this.pruneExpiredToasts();
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
      if (toast.duration && toast.duration > 0) {
        this.expirations.set(id, Date.now() + toast.duration);
      }

      // Limit number of toasts and clear any orphaned timers for removed toasts
      if (this.toasts.length > TOAST_DEFAULTS.MAX_TOASTS) {
        const removed = this.toasts.slice(TOAST_DEFAULTS.MAX_TOASTS);
        removed.forEach(t => {
          const timeout = this.timeouts.get(t.id);
          if (timeout) {
            clearTimeout(timeout);
            this.timeouts.delete(t.id);
          }
          this.expirations.delete(t.id);
        });
        this.toasts = this.toasts.slice(0, TOAST_DEFAULTS.MAX_TOASTS);
      }

      // Set up auto-dismiss if duration > 0
      if (toast.duration && toast.duration > 0) {
        const timeout = setTimeout(() => {
          this.remove(id);
        }, toast.duration);
        this.timeouts.set(id, timeout);
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
      const exists = this.toasts.some(toast => toast.id === id);
      if (!exists) {
        return false;
      }

      const timeout = this.timeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(id);
      }
      this.expirations.delete(id);

      this.toasts = this.toasts.filter(toast => toast.id !== id);
      this.notifyListeners();
      return true;
    } catch (error) {
      logger.error('ToastService: Failed to remove toast:', error);
      return false;
    }
  }

  // Clear all toasts
  clear(): void {
    try {
      this.timeouts.forEach(timeout => clearTimeout(timeout));
      this.timeouts.clear();
      this.expirations.clear();
      this.toasts = [];
      this.notifyListeners();
    } catch (error) {
      logger.error('ToastService: Failed to clear toasts:', error);
    }
  }

  private pruneExpiredToasts(): void {
    if (!this.expirations.size || !this.toasts.length) return;

    const now = Date.now();
    const initialLength = this.toasts.length;

    this.toasts = this.toasts.filter(toast => {
      const expiry = this.expirations.get(toast.id);
      const expired = expiry !== undefined && expiry <= now;

      if (expired) {
        const timeout = this.timeouts.get(toast.id);
        if (timeout) {
          clearTimeout(timeout);
          this.timeouts.delete(toast.id);
        }
        this.expirations.delete(toast.id);
      }

      return !expired;
    });

    if (this.toasts.length !== initialLength) {
      this.notifyListeners();
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