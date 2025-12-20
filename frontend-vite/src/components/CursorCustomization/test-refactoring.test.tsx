import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { useCursorSelection } from './hooks/useCursorSelection';
import { useCursorState } from './hooks/useCursorState';
import { Navigation } from './Navigation';
import { SettingsModal } from './SettingsModal';
import { vi } from 'vitest';

// Mock the dependencies
const mockInvoke = vi.fn();
const mockLoadAvailableCursors = vi.fn();
const mockShowMessage = vi.fn();
const mockPreview = {
  selectCursor: vi.fn(),
  selectedCursor: null,
  cancelSelection: vi.fn(),
  clearSelection: vi.fn()
};

describe('Refactored CursorCustomization Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCursorSelection Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useCursorSelection());

      expect(result.current.customizationMode).toBe('simple');
      expect(result.current.selectingCursorForCustomization).toBe(false);
      expect(result.current.pendingLibraryCursor).toBeNull();
      expect(result.current.selectedLibraryCursor).toBeNull();
    });

    it('should handle mode change correctly', async () => {
      const { result } = renderHook(() => useCursorSelection());

      // Create the mode change handler with dependencies
      const handleModeChange = result.current.createHandleModeChange(
        mockInvoke,
        mockLoadAvailableCursors,
        mockShowMessage
      );

      await act(async () => {
        await handleModeChange('advanced');
      });

      expect(mockInvoke).toHaveBeenCalledWith('switch_customization_mode', { mode: 'advanced' });
      expect(result.current.customizationMode).toBe('advanced');
      expect(mockLoadAvailableCursors).toHaveBeenCalled();
    });

    it('should handle browse action when no pending cursor', () => {
      const { result } = renderHook(() => useCursorSelection());
      const mockCursor = { name: 'Test', display_name: 'Test Cursor' };

      act(() => {
        result.current.handleBrowse(mockCursor);
      });

      expect(result.current.selectingCursorForCustomization).toBe(true);
    });
  });

  describe('useCursorState Hook', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useCursorState());

      expect(result.current.showSettingsModal).toBe(false);
      expect(result.current.showClickPointPicker).toBe(false);
      expect(result.current.clickPointItemId).toBeNull();
      expect(result.current.currentView).toBe('cursors');
    });

    it('should toggle settings modal', () => {
      const { result } = renderHook(() => useCursorState());

      act(() => {
        result.current.toggleSettingsModal();
      });

      expect(result.current.showSettingsModal).toBe(true);

      act(() => {
        result.current.toggleSettingsModal();
      });

      expect(result.current.showSettingsModal).toBe(false);
    });

    it('should handle click point editor opening', () => {
      const { result } = renderHook(() => useCursorState());
      const mockSetClickPointFilePath = vi.fn();

      act(() => {
        result.current.openClickPointEditor('test/path', 'item123', mockSetClickPointFilePath);
      });

      expect(mockSetClickPointFilePath).toHaveBeenCalledWith('test/path');
      expect(result.current.clickPointItemId).toBe('item123');
      expect(result.current.showClickPointPicker).toBe(true);
    });
  });

  describe('Component Integration', () => {
    it('should render Navigation component', () => {
      const mockSetCurrentView = vi.fn();

      render(
        React.createElement(Navigation, {
          currentView: "cursors",
          setCurrentView: mockSetCurrentView
        })
      );

      const cursorButton = screen.getByLabelText('Cursor Customization');
      const settingsButton = screen.getByLabelText('Settings');

      expect(cursorButton).toBeDefined();
      expect(settingsButton).toBeDefined();

      fireEvent.click(settingsButton);
      expect(mockSetCurrentView).toHaveBeenCalledWith('settings');
    });

  });
});