// Toast system types and interfaces
export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string | number;
  text: string;
  type: ToastType;
  duration?: number;
  position?: string;
  isClosing?: boolean;
}

export interface ToastOptions {
  duration?: number;
  position?: string;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastPositionClasses {
  container: string;
  item: string;
}

export const TOAST_POSITIONS_MAP: Record<string, ToastPositionClasses> = {
  'top-right': {
    container: 'top-4 right-4',
    item: 'mb-2'
  },
  'top-left': {
    container: 'top-4 left-4',
    item: 'mb-2'
  },
  'bottom-right': {
    container: 'bottom-4 right-4',
    item: 'mt-2'
  },
  'bottom-left': {
    container: 'bottom-4 left-4',
    item: 'mt-2'
  }
} as const;