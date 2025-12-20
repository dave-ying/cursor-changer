import React from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input className={cn('w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400', className)} {...props} />
  );
}