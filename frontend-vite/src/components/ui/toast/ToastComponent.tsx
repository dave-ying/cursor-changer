import React from 'react';
import { ToastIcon } from '../icons';
import { Toast } from '../../../types/toastTypes';
import { TOAST_ANIMATION_CLASSES } from '../../../constants/toastConstants';

export interface ToastComponentProps {
  toast: Toast;
  onRemove: (id: string | number) => void;
  className?: string;
  position?: string;
}

export function ToastComponent({ toast, onRemove, className = '', position = 'bottom-right' }: ToastComponentProps) {
  const handleClose = (): void => {
    onRemove(toast.id);
  };

  // Get styling based on toast type
  const getToastStyles = (): string => {
    const baseClasses = 'flex items-center w-full max-w-xs p-4 rounded-lg shadow-lg border transition-all duration-300 ease-in-out backdrop-blur-sm';
    
    switch (toast.type) {
      case 'success':
        return `${baseClasses} border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200`;
      case 'error':
        return `${baseClasses} border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200`;
      case 'warning':
        return `${baseClasses} border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200`;
      default: // info
        return `${baseClasses} border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200`;
    }
  };

  const getIconColors = (): string => {
    switch (toast.type) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default: // info
        return 'text-blue-400';
    }
  };

  // Get animation classes based on position
  const getAnimationClasses = (): string => {
    if (position && position.includes('top')) {
      return TOAST_ANIMATION_CLASSES.TOP_ENTER;
    } else {
      return TOAST_ANIMATION_CLASSES.BOTTOM_ENTER;
    }
  };

  return (
    <div
      className={`
        ${getToastStyles()}
        ${getAnimationClasses()}
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0">
        <ToastIcon type={toast.type} className={getIconColors()} size="md" />
      </div>
      
      <div className="ms-3 text-sm font-medium border-s border-gray-300 dark:border-gray-600 ps-3.5">
        {toast.text}
      </div>
      
      <button
        type="button"
        className="
          ms-auto flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
          bg-transparent box-border border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700
          focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-600 font-medium leading-5 rounded-md text-sm h-8 w-8
          focus:outline-none transition-colors duration-200
        "
        onClick={handleClose}
        aria-label="Close notification"
      >
        <span className="sr-only">Close</span>
        <svg
          className="w-4 h-4"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18 17.94 6M18 18 6.06 6"
          />
        </svg>
      </button>
    </div>
  );
}