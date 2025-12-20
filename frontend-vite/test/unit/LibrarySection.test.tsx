import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock AppContext before importing components that call useApp
const mockApp = {
  invoke: () => Promise.resolve(),
  loadLibraryCursors: () => Promise.resolve()
};

vi.mock('@/context/AppContext', () => ({
  useApp: () => mockApp
}));

import { LibrarySection } from '@/components/CursorCustomization/LibrarySection';

// The AppContext is mocked above

describe('LibrarySection', () => {
  it('renders Add Cursor button with pill (rounded-full) class', () => {
    render(
      <LibrarySection
        localLibrary={[]}
        selectingFromLibrary={false}
        selectedCursor={null}
        pendingLibraryCursor={null}
        selectedLibraryCursor={null}
        onAddCursor={() => {}}
        onSelectFromLibrary={() => {}}
        onOpenHotspotEditor={() => {}}
        onLibraryOrderChange={() => {}}
        onApplyFromLibrary={() => {}}
        onDeleteLibraryCursor={() => {}}
        id="library-section"
        className=""
      />
    );

    const addButton = screen.getByRole('button', { name: /add a cursor to library/i });
    expect(addButton.className).toMatch(/rounded-full/);
  });

  it('renders Cancel button with pill (rounded-full) class when selectingFromLibrary is true and selectedCursor provided', () => {
    render(
      <LibrarySection
        localLibrary={[]}
        selectingFromLibrary={true}
        selectedCursor={{ id: 'lib_1', name: 'Custom Arrow' }}
        pendingLibraryCursor={null}
        selectedLibraryCursor={null}
        onAddCursor={() => {}}
        onSelectFromLibrary={() => {}}
        onOpenHotspotEditor={() => {}}
        onLibraryOrderChange={() => {}}
        onApplyFromLibrary={() => {}}
        onDeleteLibraryCursor={() => {}}
        id="library-section"
        className=""
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel cursor selection/i });
    expect(cancelButton.className).toMatch(/rounded-full/);
  });
});
