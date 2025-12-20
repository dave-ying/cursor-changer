import React from 'react';
import { ToastComponent } from './ToastComponent';
import { useToast } from '../../../hooks/useToast';
import { TOAST_DEFAULTS } from '../../../constants/toastConstants';

export interface ToastContainerProps {
  position?: string;
  maxToasts?: number;
  className?: string;
}

export function ToastContainer({
  position = 'bottom-right',
  maxToasts = TOAST_DEFAULTS.MAX_TOASTS,
  className = ''
}: ToastContainerProps) {
  const { toasts, removeToast } = useToast();

  // Position classes
  const getContainerClasses = (): string => {
    const baseClasses = 'fixed z-50 flex flex-col gap-2 p-4 pointer-events-none';
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4'
    }[position] || 'bottom-4 right-4';

    return `${baseClasses} ${positionClasses} ${className}`;
  };

  // Limit toasts if needed
  const displayedToasts = toasts.slice(0, maxToasts);

  if (displayedToasts.length === 0) {
    return null;
  }

  return (
    <div className={getContainerClasses()}>
      {displayedToasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            zIndex: 1000 + index // Ensure proper stacking
          }}
        >
          <ToastComponent
            toast={toast}
            onRemove={removeToast}
            position={position}
          />
        </div>
      ))}
    </div>
  );
}