// Success icon component for toast notifications
import React from 'react';

interface SuccessIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SuccessIcon({ className = '', size = 'md' }: SuccessIconProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <svg 
      className={`${sizeClasses[size]} ${className}`}
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
        d="m5 13 4 4L19 7"
      />
    </svg>
  );
}