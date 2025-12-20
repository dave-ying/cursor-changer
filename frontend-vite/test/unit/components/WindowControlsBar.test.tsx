import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const minimize = vi.fn().mockResolvedValue(undefined);
const maximize = vi.fn().mockResolvedValue(undefined);
const unmaximize = vi.fn().mockResolvedValue(undefined);

const getAppWindow = vi.fn(() => ({ minimize, maximize, unmaximize }));
const updateMaximizeState = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    getAppWindow,
  }),
}));

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: any) =>
    selector({
      operations: { updateMaximizeState },
      isMaximized: false,
    })
}));

describe('components/WindowControlsBar', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls window minimize/maximize and delegates close', async () => {
    const { WindowControlsBar } = await import('@/components/WindowControlsBar');

    const onCloseClick = vi.fn();

    render(<WindowControlsBar onCloseClick={onCloseClick} />);

    fireEvent.click(screen.getByLabelText('Minimize window'));
    await waitFor(() => expect(minimize).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('Maximize window'));
    await waitFor(() => expect(maximize).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('Close window'));
    expect(onCloseClick).toHaveBeenCalled();
  });
});
