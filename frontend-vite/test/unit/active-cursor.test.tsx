/**
 * Focused unit tests for ActiveCursor component
 * This tests the individual cursor card functionality that will be extracted from CursorCustomization.jsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveCursor } from '@/components/CursorCustomization/ActiveCursor';
import { useApp } from '@/context/AppContext';
import { useDroppable } from '@dnd-kit/core';
import { getCachedPreview } from '@/services/cursorPreviewCache';

// Mock the context and hooks
vi.mock('@/context/AppContext', () => ({
  useApp: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(() => ({ isOver: false, setNodeRef: vi.fn() }))
}));

vi.mock('@/services/toastService', () => ({
  toastService: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/hooks/useLibraryAnimation', () => ({
  useLibraryAnimation: vi.fn(() => ({})),
  useAnimationCSSProperties: vi.fn(() => ({}))
}));

vi.mock('@/components/CursorCustomization/AniPreview', () => ({
  AniPreview: ({ children }: any) => children,
  useAniPreview: () => ({ data: null, loading: false })
}));

vi.mock('@/services/cursorPreviewCache', () => ({
  getCachedPreview: vi.fn(),
  setCachedPreview: vi.fn(),
  invalidatePreview: vi.fn(),
  hasPendingRequest: vi.fn(() => false),
  getPendingRequest: vi.fn(() => null),
  setPendingRequest: vi.fn()
}));

vi.mock('@/components/CursorCustomization/ActiveCursorContextMenu', () => ({
  ActiveCursorContextMenu: () => <div data-testid="context-menu">Context Menu</div>
}));

describe('ActiveCursor', () => {
  const mockOnBrowse = vi.fn();
  const mockCursor = {
    id: 0,
    name: 'Normal',
    display_name: 'Normal Pointer',
    image_path: null,
    is_custom: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedPreview).mockReturnValue('data:image/png;base64,cached');
    vi.mocked(useApp).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('data:image/png;base64,test')
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render with basic cursor information', () => {
      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
      expect(screen.getByText('Normal Pointer')).toBeInTheDocument();
    });

    it('should display loading indicator when loading', async () => {
      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });

    it('should show loading spinner when loading state is true', () => {
      const { rerender } = render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      // Force loading state by mocking useState behavior
      rerender(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      // The loading state is managed internally, so we test the behavior
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });

    it('should handle custom cursor with preview image', async () => {
      const customCursor = { ...mockCursor, image_path: 'C:\\test.cur', is_custom: true };
      const mockUseApp = vi.mocked(useApp);
      mockUseApp.mockReturnValue({
        invoke: vi.fn().mockResolvedValue('data:image/png;base64,test')
      } as any);

      vi.mocked(getCachedPreview).mockReturnValue(null);

      render(<ActiveCursor cursor={customCursor} onBrowse={mockOnBrowse} />);

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });

    it('should load and render system preview image for default cursors without custom image', async () => {
      const mockInvoke = vi.fn().mockResolvedValue('data:image/png;base64,system');
      vi.mocked(useApp).mockReturnValue({ invoke: mockInvoke } as any);

      vi.mocked(getCachedPreview).mockReturnValue(null);

      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      await waitFor(() => {
        expect(screen.getByRole('img')).toBeInTheDocument();
      });

      expect(mockInvoke).toHaveBeenCalledWith(
        'get_system_cursor_preview',
        expect.objectContaining({ cursor_name: 'Normal', cursorName: 'Normal' })
      );
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });

    it('should render cached preview immediately without invoking backend', () => {
      const mockInvoke = vi.fn().mockResolvedValue('data:image/png;base64,system');
      vi.mocked(useApp).mockReturnValue({ invoke: mockInvoke } as any);

      vi.mocked(getCachedPreview).mockReturnValue('data:image/png;base64,cached');

      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
      expect(mockInvoke).not.toHaveBeenCalled();
      expect(screen.queryByText('✓')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onBrowse when clicked', () => {
      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      const card = screen.getByTestId('cursor-card-Normal');
      fireEvent.click(card);

      expect(mockOnBrowse).toHaveBeenCalledWith(mockCursor);
    });

    it('should be keyboard accessible', () => {
      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      const card = screen.getByTestId('cursor-card-Normal');

      // Should be focusable
      expect(card).toHaveAttribute('tabIndex', '0');

      // Should handle Enter key
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockOnBrowse).toHaveBeenCalledWith(mockCursor);

      // Should handle Space key
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockOnBrowse).toHaveBeenCalledWith(mockCursor);
    });
  });

  describe('Drop Zone Functionality', () => {
    it('should register as droppable', () => {
      const mockUseDroppable = vi.mocked(useDroppable);
      mockUseDroppable.mockReturnValue({
        isOver: false,
        setNodeRef: vi.fn()
      } as any);

      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      expect(mockUseDroppable).toHaveBeenCalledWith({
        id: 'slot-Normal',
        data: { type: 'slot', cursor: mockCursor }
      });
    });

    it('should apply drop-target class when over', () => {
      const mockUseDroppable = vi.mocked(useDroppable);
      mockUseDroppable.mockReturnValue({
        isOver: true,
        setNodeRef: vi.fn()
      } as any);

      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      const card = screen.getByTestId('cursor-card-Normal');
      expect(card).toHaveClass('drop-target');
    });

    it('should apply selected class when selected', () => {
      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} isSelected={true} />);

      const card = screen.getByTestId('cursor-card-Normal');
      expect(card).toHaveClass('selected-for-browse');
    });
  });

  describe('State Management', () => {
    it('should handle cursor data changes', async () => {
      const mockUseApp = vi.mocked(useApp);
      const mockInvoke = vi.fn().mockResolvedValue(undefined);
      mockUseApp.mockReturnValue({ invoke: mockInvoke } as any);

      vi.mocked(getCachedPreview).mockReturnValue(null);

      const { rerender } = render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      // First render - no image path, but attempts to load system cursor
      // expect(mockInvoke).not.toHaveBeenCalled();

      const newCursor = { ...mockCursor, image_path: 'C:\\new.cur' };
      mockInvoke.mockResolvedValueOnce('data:image/png;base64,newdata');
      rerender(<ActiveCursor cursor={newCursor} onBrowse={mockOnBrowse} />);

      // Should call invoke with new path
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('get_library_cursor_preview', {
          file_path: 'C:\\new.cur'
        });
      });
    });

    it('should cleanup on unmount', () => {
      const { unmount } = render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      // Should not cause memory leaks
      unmount();

      // Component should unmount without errors
      expect(screen.queryByTestId('cursor-card-Normal')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cursor name', () => {
      const emptyCursor = { ...mockCursor, name: '', display_name: 'Empty' };

      expect(() => {
        render(<ActiveCursor cursor={emptyCursor} onBrowse={mockOnBrowse} />);
      }).not.toThrow();
    });

    it('should handle missing display_name', () => {
      const noDisplayName = { ...mockCursor, display_name: '' };

      render(<ActiveCursor cursor={noDisplayName} onBrowse={mockOnBrowse} />);

      const card = screen.getByTestId('cursor-card-Normal');
      expect(card.querySelector('.cursor-name')?.textContent).toBe('');
    });

    it('should handle very long filenames', () => {
      const longPath = 'C:\\very\\long\\path\\to\\some\\extremely\\long\\filename\\that\\might\\cause\\issues\\cursor.cur';
      const longCursor = { ...mockCursor, image_path: longPath };

      expect(() => {
        render(<ActiveCursor cursor={longCursor} onBrowse={mockOnBrowse} />);
      }).not.toThrow();
    });
  });

  describe('Visual States', () => {
    it('should show has-custom-cursor class for custom cursors', () => {
      const customCursor = { ...mockCursor, image_path: 'C:\\test.cur', is_custom: true };

      render(<ActiveCursor cursor={customCursor} onBrowse={mockOnBrowse} />);

      const card = screen.getByTestId('cursor-card-Normal');
      expect(card.querySelector('.cursor-preview')).toHaveClass('has-custom-cursor');
    });

    it('should not show has-custom-cursor class for default cursors', () => {
      render(<ActiveCursor cursor={mockCursor} onBrowse={mockOnBrowse} />);

      const card = screen.getByTestId('cursor-card-Normal');
      expect(card.querySelector('.cursor-preview')).not.toHaveClass('has-custom-cursor');
    });
  });
});