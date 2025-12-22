import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getCachedPreview } from '@/services/cursorPreviewCache';

// Mocks
const mockInvoke = vi.fn();
const mockLoadLibraryCursors = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    invoke: mockInvoke,
  })
}));

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: any) =>
    selector({
      operations: {
        loadLibraryCursors: mockLoadLibraryCursors
      }
    })
}));

vi.mock('@/hooks/useMessage', () => ({
  useMessage: () => ({
    showMessage: mockShowMessage,
    addToast: vi.fn(),
    message: { text: '', type: '' }
  })
}));

vi.mock('@/hooks/useLibraryAnimation', () => ({
  useLibraryAnimation: vi.fn(() => ({})),
  useAnimationCSSProperties: vi.fn(() => ({}))
}));

vi.mock('@/components/CursorCustomization/AniPreview', () => ({
  AniPreview: ({ children }: any) => children,
  useAniPreview: () => ({ data: null, loading: false, error: null })
}));

vi.mock('@/services/cursorPreviewCache', () => ({
  getCachedPreview: vi.fn(() => null),
  setCachedPreview: vi.fn(),
  hasPendingRequest: vi.fn(() => false),
  getPendingRequest: vi.fn(() => null),
  setPendingRequest: vi.fn()
}));

// Mock dnd-kit sortable hook
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: '',
    isDragging: false
  })
}));

import { LibraryCursor } from '@/components/CursorCustomization/LibraryCursor';

describe('LibraryCursor', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockLoadLibraryCursors.mockReset();
    mockShowMessage.mockReset();
    vi.mocked(getCachedPreview).mockReset();
  });

  it('renders cached preview immediately without invoking backend', () => {
    const item = { id: 'lib_cached', name: 'Cached', file_path: 'C:\\cached.cur' };
    vi.mocked(getCachedPreview).mockReturnValue('data:image/png;base64,cached');

    render(<LibraryCursor item={item} />);

    expect(screen.getByRole('img', { name: 'Cached' })).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('loads preview via read_cursor_file_as_data_url and renders image', async () => {
    const item = { id: 'lib_2', name: 'Preview', file_path: 'C:\\preview.cur' };

    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd === 'read_cursor_file_as_data_url') {
        expect(args).toEqual({ file_path: 'C:\\preview.cur' });
        return Promise.resolve('data:image/png;base64,from_read');
      }
      return Promise.resolve(undefined);
    });

    render(<LibraryCursor item={item} />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Preview' })).toBeInTheDocument();
    });

    expect(mockInvoke).toHaveBeenCalledWith('read_cursor_file_as_data_url', { file_path: 'C:\\preview.cur' });
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('falls back to get_library_cursor_preview when read_cursor_file_as_data_url fails', async () => {
    const item = { id: 'lib_3', name: 'Fallback', file_path: 'C:\\fallback.cur' };

    mockInvoke.mockImplementation((cmd: string, args?: any) => {
      if (cmd === 'read_cursor_file_as_data_url') {
        return Promise.reject(new Error('read failed'));
      }
      if (cmd === 'get_library_cursor_preview') {
        expect(args).toEqual({ file_path: 'C:\\fallback.cur' });
        return Promise.resolve('data:image/png;base64,from_fallback');
      }
      return Promise.resolve(undefined);
    });

    render(<LibraryCursor item={item} />);

    await waitFor(() => {
      expect(screen.getByRole('img', { name: 'Fallback' })).toBeInTheDocument();
    });

    expect(mockInvoke).toHaveBeenCalledWith('read_cursor_file_as_data_url', { file_path: 'C:\\fallback.cur' });
    expect(mockInvoke).toHaveBeenCalledWith('get_library_cursor_preview', { file_path: 'C:\\fallback.cur' });
    expect(screen.queryByText('✓')).not.toBeInTheDocument();
  });

  it('calls invoke and showMessage when delete is selected from context menu', async () => {
    const item = { id: 'lib_1', name: 'Test', file_path: 'C:\\test.cur' };

    mockInvoke.mockResolvedValue({ success: true });

    render(<LibraryCursor item={item} />);

    const card = screen.getByTestId('library-card-lib_1');

    // Open context menu via right click
    fireEvent.contextMenu(card);

    // Click the Delete menu item (text: Delete)
    const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('remove_cursor_from_library', { id: 'lib_1' });
      expect(mockShowMessage).toHaveBeenCalledWith('Removed Test from library', 'success');
      expect(mockLoadLibraryCursors).toHaveBeenCalled();
    });
  });
});
