import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/icons', () => ({
  ToastIcon: ({ className }: { className?: string }) => <div data-testid="toast-icon" className={className} />,
}));

describe('components/ui/toast/ToastComponent', () => {
  it('renders text and calls onRemove when close button is clicked', async () => {
    const { ToastComponent } = await import('@/components/ui/toast/ToastComponent');

    const onRemove = vi.fn();

    render(
      <ToastComponent
        toast={{ id: 1, text: 'Hello', type: 'success' }}
        onRemove={onRemove}
        position="top-right"
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Hello');
    expect(screen.getByTestId('toast-icon').className).toContain('text-green-400');

    fireEvent.click(screen.getByLabelText('Close notification'));
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('applies styles for error toasts', async () => {
    const { ToastComponent } = await import('@/components/ui/toast/ToastComponent');

    render(
      <ToastComponent
        toast={{ id: 2, text: 'Oops', type: 'error' }}
        onRemove={vi.fn()}
        position="bottom-right"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('border-red-200');
    expect(screen.getByTestId('toast-icon').className).toContain('text-red-400');
  });

  it('falls back to info styles for unknown types', async () => {
    const { ToastComponent } = await import('@/components/ui/toast/ToastComponent');

    render(
      <ToastComponent
        toast={{ id: 3, text: 'Info', type: 'info' }}
        onRemove={vi.fn()}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('border-gray-200');
    expect(screen.getByTestId('toast-icon').className).toContain('text-blue-400');
  });
});
