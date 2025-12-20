import { toastService } from '../services/toastService';

// Integration utilities for connecting the new toast system with the existing app
export class ToastIntegration {
  private static isIntegrated = false;

  static integrateWithStore(storeMethods: {
    addToast: (text: string, type?: any, duration?: number) => void;
    removeToast: (id: any) => void;
  }): void {
    if (this.isIntegrated) return;

    // Subscribe to toast service changes and update store
    toastService.subscribe(() => {
      const toasts = toastService.getToasts();
      // If store expects toast state updates, call the appropriate method
      if (typeof storeMethods.addToast === 'function' && toasts.length > 0) {
        // This would typically update some store state if needed
        // For now, just ensure the service is working
      }
    });

    this.isIntegrated = true;
  }

  static getService() {
    return toastService;
  }

  static show(text: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', duration = 5000) {
    return toastService.show(text, type, { duration });
  }
}