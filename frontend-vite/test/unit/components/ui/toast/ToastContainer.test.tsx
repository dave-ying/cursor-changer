import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const removeToast = vi.fn();
const mockUseToast = vi.fn();

vi.mock('@/hooks/useToast', () => ({
  useToast: () => mockUseToast(),
}));

vi.mock('@/components/ui/toast/ToastComponent', () => ({
  ToastComponent: ({ toast }: any) => <div data-testid={`toast-${toast.id}`}>{toast.text}</div>,
}));

describe('components/ui/toast/ToastContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there are no toasts', async () => {
    mockUseToast.mockReturnValue({ toasts: [], removeToast });
    const { ToastContainer } = await import('@/components/ui/toast/ToastContainer');

    const { container } = render(<ToastContainer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders toasts and applies position classes', async () => {
    mockUseToast.mockReturnValue({
      toasts: [
        { id: 1, text: 'A', type: 'info' },
        { id: 2, text: 'B', type: 'success' },
      ],
      removeToast,
    });

    const { ToastContainer } = await import('@/components/ui/toast/ToastContainer');

    render(<ToastContainer position="top-left" maxToasts={1} />);

    const root = screen.getByTestId('toast-1').parentElement?.parentElement;
    expect(root?.className).toContain('top-4');
    expect(root?.className).toContain('left-4');

    expect(screen.getByTestId('toast-1')).toBeInTheDocument();
    expect(screen.queryByTestId('toast-2')).not.toBeInTheDocument();
  });
});
