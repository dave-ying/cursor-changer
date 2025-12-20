import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClickOutsideHandler } from '@/components/CursorCustomization/ClickOutsideHandler';

describe('ClickOutsideHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls cancelPreviewSelection and cancelBrowseMode on outside mouseDown when selectingFromLibrary is true', () => {
    const cancelPreviewSelection = vi.fn();
    const cancelBrowseMode = vi.fn();

    render(
      <ClickOutsideHandler
        selectingFromLibrary={true}
        pendingLibraryCursor={null}
        selectingCursorForCustomization={false}
        cancelBrowseMode={cancelBrowseMode}
        cancelPreviewSelection={cancelPreviewSelection}
      />
    );

    // Simulate clicking outside
    fireEvent.mouseDown(document.body);

    expect(cancelPreviewSelection).toHaveBeenCalled();
    expect(cancelBrowseMode).toHaveBeenCalled();
  });

  it('does not call handlers when not in any selection mode', () => {
    const cancelPreviewSelection = vi.fn();
    const cancelBrowseMode = vi.fn();

    render(
      <ClickOutsideHandler
        selectingFromLibrary={false}
        pendingLibraryCursor={null}
        selectingCursorForCustomization={false}
        cancelBrowseMode={cancelBrowseMode}
        cancelPreviewSelection={cancelPreviewSelection}
      />
    );

    fireEvent.mouseDown(document.body);

    expect(cancelPreviewSelection).not.toHaveBeenCalled();
    expect(cancelBrowseMode).not.toHaveBeenCalled();
  });
});
