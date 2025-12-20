// Toast icon registry - central place for icon management
import React from 'react';
import { SuccessIcon } from './SuccessIcon';
import { ErrorIcon } from './ErrorIcon';
import { WarningIcon } from './WarningIcon';
import { InfoIcon } from './InfoIcon';
import { ToastType } from '../../../types/toastTypes';

export interface ToastIconProps {
  type: ToastType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ToastIcon({ type, className = '', size = 'md' }: ToastIconProps) {
  const iconProps = { className, size };

  switch (type) {
    case 'success':
      return React.createElement(SuccessIcon, iconProps);
    case 'error':
      return React.createElement(ErrorIcon, iconProps);
    case 'warning':
      return React.createElement(WarningIcon, iconProps);
    case 'info':
    default:
      return React.createElement(InfoIcon, iconProps);
  }
}

// Export individual icons for direct usage if needed
export { SuccessIcon, ErrorIcon, WarningIcon, InfoIcon };