import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: any) => selector({ clearMessage: vi.fn() })
}));

describe('components/ui/Toast (legacy)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('auto-closes after duration > 0 and calls onClose when provided', async () => {
    const { Toast } = await import('@/components/ui/Toast');
    const onClose = vi.fn();

    render(<Toast id="1" message="Hello" type="info" duration={10} onClose={onClose} />);

    vi.advanceTimersByTime(10);

    expect(onClose).toHaveBeenCalledWith('1');
  });

  it('close button calls onClose when provided', async () => {
    const { Toast } = await import('@/components/ui/Toast');
    const onClose = vi.fn();

    render(<Toast id="2" message="Hello" type="success" duration={0} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledWith('2');

    const check = screen.getByRole('alert').querySelector('path');
    expect(check?.getAttribute('d')).toContain('m5 13');
  });

  it('renders distinct icons by type', async () => {
    const { Toast } = await import('@/components/ui/Toast');

    const { rerender } = render(<Toast id="3" message="E" type="error" duration={0} />);
    expect(screen.getByRole('alert').querySelector('path')?.getAttribute('d')).toContain('m6 18');

    rerender(<Toast id="4" message="W" type="warning" duration={0} />);
    expect(screen.getByRole('alert').querySelector('path')?.getAttribute('d')).toContain('M12 9v4');

    rerender(<Toast id="5" message="I" type="info" duration={0} />);
    expect(screen.getByRole('alert').querySelector('path')?.getAttribute('d')).toContain('M13 16h-1');
  });
});
