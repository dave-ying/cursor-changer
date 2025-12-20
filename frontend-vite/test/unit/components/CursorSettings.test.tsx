/**
 * Unit tests for CursorSettings component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { CursorSettings } from '@/components/Settings/CursorSettings';
import { MAX_CURSOR_SIZE } from '@/constants/cursorConstants';

const mockSetCursorSize = vi.fn();
const mockSetDefaultCursorStyle = vi.fn();
const mockShowMessage = vi.fn();
const mockLoadAvailableCursors = vi.fn(() => Promise.resolve());

const mockInvoke = vi.fn((cmd: string, args?: any) => {
  switch (cmd) {
    case 'reset_current_mode_cursors':
    case 'set_default_cursor_style':
    case 'show_library_cursors_folder':
      return Promise.resolve();
    default:
      return Promise.resolve(undefined);
  }
});

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    invoke: mockInvoke,
  })
}));

vi.mock('@/context/MessageContext', () => ({
  useMessage: () => ({
    showMessage: mockShowMessage,
  })
}));

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: any) =>
    selector({
      cursorState: {
        cursorSize: 32,
        defaultCursorStyle: 'windows',
        accentColor: '#7c3aed'
      },
      operations: {
        setCursorSize: mockSetCursorSize,
        setDefaultCursorStyle: mockSetDefaultCursorStyle,
        loadAvailableCursors: mockLoadAvailableCursors,
      }
    })
}));

beforeEach(() => {
  mockInvoke.mockClear();
  mockSetCursorSize.mockClear();
  mockSetDefaultCursorStyle.mockClear();
  mockShowMessage.mockClear();
  mockLoadAvailableCursors.mockClear();
});

afterEach(() => {
  cleanup();
});

function renderCursorSettings() {
  return render(<CursorSettings />);
}

describe('CursorSettings Component', () => {
  describe('Rendering', () => {
    it('renders cursor settings section', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByText('Cursor Settings')).toBeInTheDocument();
      });
    });

    it('renders cursor size slider', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByText('Cursor Size')).toBeInTheDocument();
        expect(screen.getByRole('slider')).toBeInTheDocument();
      });
    });

    it('renders default cursors toggle group', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByText('Default Cursors')).toBeInTheDocument();
        expect(screen.getByLabelText('Windows style cursors')).toBeInTheDocument();
        expect(screen.getByLabelText('Mac style cursors')).toBeInTheDocument();
      });
    });

    it('renders reset cursors button', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByText('Reset Active to Default')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset cursors/i })).toBeInTheDocument();
      });
    });

    it('renders library folder button', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByText('Library Cursors Folder')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument();
      });
    });
  });

  describe('Cursor Size', () => {
    it('displays current cursor size', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByText('32')).toBeInTheDocument();
        expect(screen.getByText('px')).toBeInTheDocument();
      });
    });

    it('slider has correct min and max values', async () => {
      renderCursorSettings();

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        expect(slider).toHaveAttribute('aria-valuemin', '32');
        expect(slider).toHaveAttribute('aria-valuemax', String(MAX_CURSOR_SIZE));
      });
    });
  });

  describe('Default Cursor Style', () => {
    it('Windows style is selected by default', async () => {
      renderCursorSettings();

      await waitFor(() => {
        const windowsBtn = screen.getByLabelText('Windows style cursors');
        expect(windowsBtn).toHaveAttribute('data-state', 'on');
      });
    });

    it('calls setDefaultCursorStyle when Mac is selected', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByLabelText('Mac style cursors')).toBeInTheDocument();
      });

      const macBtn = screen.getByLabelText('Mac style cursors');
      fireEvent.click(macBtn);

      await waitFor(() => {
        expect(mockSetDefaultCursorStyle).toHaveBeenCalledWith('mac');
        expect(mockInvoke).toHaveBeenCalledWith('reset_current_mode_cursors');
        expect(mockLoadAvailableCursors).toHaveBeenCalled();
      });
    });
  });

  describe('Reset Cursors', () => {
    it('renders reset cursors button', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset cursors/i })).toBeInTheDocument();
      });
    });

    it('reset button is clickable', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reset cursors/i })).toBeInTheDocument();
      });

      const resetBtn = screen.getByRole('button', { name: /reset cursors/i });
      expect(() => fireEvent.click(resetBtn)).not.toThrow();
    });
  });

  describe('Library Folder', () => {
    it('renders open folder button', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument();
      });
    });

    it('open folder button is clickable', async () => {
      renderCursorSettings();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /open folder/i })).toBeInTheDocument();
      });

      const openFolderBtn = screen.getByRole('button', { name: /open folder/i });
      expect(() => fireEvent.click(openFolderBtn)).not.toThrow();
    });
  });
});
