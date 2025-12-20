import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActiveSection } from '@/components/CursorCustomization/ActiveSection';

const noop = () => { };

describe('ActiveSection', () => {
  it('shows ModeToggle in the top right (pill shape) when not selecting from library', () => {
    render(
      <ActiveSection
        visibleCursors={[]}
        customizationMode="simple"
        selectingFromLibrary={false}
        selectedCursor={null}
        pendingLibraryCursor={null}
        selectedLibraryCursor={null}
        selectingCursorForCustomization={false}
        onBrowse={noop}
        onModeChange={noop}
        onCancelPendingLibraryCursor={noop}
        loadAvailableCursors={noop}
      />
    );

    // ToggleGroupItem uses role="radio" not role="button"
    const simpleRadio = screen.getByRole('radio', { name: /simple/i });
    const group = simpleRadio.closest('[role="group"]');
    expect(group.className).toMatch(/rounded-full/);
  });

  it('shows Cancel button with pill (rounded-full) class when pendingLibraryCursor is set', () => {
    render(
      <ActiveSection
        visibleCursors={[]}
        customizationMode="simple"
        selectingFromLibrary={false}
        selectedCursor={null}
        pendingLibraryCursor={{ id: 'lib_1', name: 'Test' }}
        selectedLibraryCursor={null}
        selectingCursorForCustomization={false}
        onBrowse={noop}
        onModeChange={noop}
        onCancelPendingLibraryCursor={noop}
        loadAvailableCursors={noop}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel cursor selection/i });
    expect(cancelButton.className).toMatch(/rounded-full/);
  });
});
