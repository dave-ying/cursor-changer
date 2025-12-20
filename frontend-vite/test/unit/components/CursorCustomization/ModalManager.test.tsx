import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const safeSetTimeout = vi.fn((cb: () => void) => cb());

vi.mock('@/hooks/useSafeAsync', () => ({
  useSafeTimer: () => ({ safeSetTimeout }),
}));

vi.mock('@/components/HotspotPicker', () => ({
  HotspotPicker: ({ onCancel, onComplete }: any) => (
    <div data-testid="hotspot-picker">
      <button onClick={onCancel}>cancel</button>
      <button onClick={onComplete}>complete</button>
    </div>
  ),
}));

vi.mock('@/components/CursorCustomization/SettingsModal', () => ({
  SettingsModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="settings-modal">
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

describe('CursorCustomization/ModalManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render HotspotPicker when showClickPointPicker is false', async () => {
    const { ModalManager } = await import('@/components/CursorCustomization/ModalManager');

    render(
      <ModalManager
        showClickPointPicker={false}
        clickPointFile={null}
        clickPointFilePath={null}
        clickPointItemId={null}
        clickPointPickerKey={1}
        setShowClickPointPicker={vi.fn()}
        setClickPointFile={vi.fn()}
        setClickPointFilePath={vi.fn()}
        setClickPointItemId={vi.fn()}
        showSettingsModal={false}
        setShowSettingsModal={vi.fn()}
        loadLibraryCursors={vi.fn()}
      />
    );

    expect(screen.queryByTestId('hotspot-picker')).not.toBeInTheDocument();
  });

  it('renders HotspotPicker when enabled and file is present; onCancel clears state', async () => {
    const { ModalManager } = await import('@/components/CursorCustomization/ModalManager');

    const setShowClickPointPicker = vi.fn();
    const setClickPointFile = vi.fn();
    const setClickPointFilePath = vi.fn();
    const setClickPointItemId = vi.fn();

    render(
      <ModalManager
        showClickPointPicker={true}
        clickPointFile={new File([new Uint8Array([1])], 'x.png', { type: 'image/png' })}
        clickPointFilePath={null}
        clickPointItemId={'id'}
        clickPointPickerKey={1}
        setShowClickPointPicker={setShowClickPointPicker}
        setClickPointFile={setClickPointFile}
        setClickPointFilePath={setClickPointFilePath}
        setClickPointItemId={setClickPointItemId}
        showSettingsModal={false}
        setShowSettingsModal={vi.fn()}
        loadLibraryCursors={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('cancel'));

    expect(setShowClickPointPicker).toHaveBeenCalledWith(false);
    expect(setClickPointFile).toHaveBeenCalledWith(null);
    expect(setClickPointFilePath).toHaveBeenCalledWith(null);
    expect(setClickPointItemId).toHaveBeenCalledWith(null);
  });

  it('onComplete clears state and schedules loadLibraryCursors', async () => {
    const { ModalManager } = await import('@/components/CursorCustomization/ModalManager');

    const setShowClickPointPicker = vi.fn();
    const setClickPointFile = vi.fn();
    const setClickPointFilePath = vi.fn();
    const setClickPointItemId = vi.fn();
    const loadLibraryCursors = vi.fn().mockResolvedValue(undefined);

    render(
      <ModalManager
        showClickPointPicker={true}
        clickPointFile={new File([new Uint8Array([1])], 'x.png', { type: 'image/png' })}
        clickPointFilePath={null}
        clickPointItemId={'id'}
        clickPointPickerKey={1}
        setShowClickPointPicker={setShowClickPointPicker}
        setClickPointFile={setClickPointFile}
        setClickPointFilePath={setClickPointFilePath}
        setClickPointItemId={setClickPointItemId}
        showSettingsModal={false}
        setShowSettingsModal={vi.fn()}
        loadLibraryCursors={loadLibraryCursors}
      />
    );

    fireEvent.click(screen.getByText('complete'));

    expect(setShowClickPointPicker).toHaveBeenCalledWith(false);
    expect(loadLibraryCursors).toHaveBeenCalled();
    expect(safeSetTimeout).toHaveBeenCalled();
  });

  it('renders SettingsModal and closes it', async () => {
    const { ModalManager } = await import('@/components/CursorCustomization/ModalManager');

    const setShowSettingsModal = vi.fn();

    render(
      <ModalManager
        showClickPointPicker={false}
        clickPointFile={null}
        clickPointFilePath={null}
        clickPointItemId={null}
        clickPointPickerKey={1}
        setShowClickPointPicker={vi.fn()}
        setClickPointFile={vi.fn()}
        setClickPointFilePath={vi.fn()}
        setClickPointItemId={vi.fn()}
        showSettingsModal={true}
        setShowSettingsModal={setShowSettingsModal}
        loadLibraryCursors={vi.fn()}
      />
    );

    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('close'));
    expect(setShowSettingsModal).toHaveBeenCalledWith(false);
  });
});
