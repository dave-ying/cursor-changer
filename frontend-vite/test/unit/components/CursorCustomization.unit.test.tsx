/**
 * Unit tests for CursorCustomization component - rendering and cursor cards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import * as React from 'react';
import { defaultMockCursors, defaultMockLibrary, resetAllMocks } from '../helpers/testSetup';

// Mock Tauri API
const mockInvoke = vi.hoisted(() => vi.fn());
let mockCursors = [...defaultMockCursors];
let mockLibrary = [...defaultMockLibrary];

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    invoke: mockInvoke
  })
}));

beforeEach(() => {
  resetAllMocks();

  mockCursors = [...defaultMockCursors];
  mockLibrary = [...defaultMockLibrary];

  mockInvoke.mockImplementation((command, args) => {
    switch (command) {
      case 'get_available_cursors':
        return Promise.resolve(mockCursors);
      case 'get_library_cursors':
        return Promise.resolve(mockLibrary);
      case 'set_cursor_image':
        return handleSetCursorImage(args);
      case 'set_single_cursor_with_size':
        return handleSetSingleCursorWithSize(args);
      case 'set_all_cursors_to_image':
        return handleSetAllCursorsToImage(args);
      case 'reset_cursor':
        return handleResetCursor(args);
      case 'reset_all_cursors':
        return handleResetAllCursors();
      case 'browse_cursor_file':
        return handleBrowseCursorFile();
      case 'read_cursor_file_as_data_url':
        return handleReadCursorFile(args);
      case 'get_system_cursor_preview':
        return Promise.resolve('data:image/png;base64,test-system');
      case 'get_library_cursor_preview':
        return Promise.resolve('data:image/png;base64,test-library');
      default:
        return Promise.reject(new Error(`Unknown command: ${command}`));
    }
  });

  // Mock Tauri API
  if (typeof window !== 'undefined') {
    (window as any).__TAURI__ = {
      core: { invoke: mockInvoke }
    };
  }
});

// Command handlers
function handleSetCursorImage(args: any) {
  const { cursor_name, image_path } = args;

  const cursor = mockCursors.find(c => c.name === cursor_name);
  if (!cursor) {
    return Promise.reject('Cursor not found');
  }

  cursor.image_path = image_path;
  cursor.is_custom = true;

  return Promise.resolve({ ...cursor });
}

function handleSetSingleCursorWithSize(args: any) {
  const { cursor_name, image_path, size } = args;

  const cursor = mockCursors.find(c => c.name === cursor_name);
  if (!cursor) {
    return Promise.reject('Cursor not found');
  }

  cursor.image_path = image_path;
  cursor.is_custom = true;

  return Promise.resolve({ ...cursor });
}

function handleSetAllCursorsToImage(args: any) {
  const { image_path } = args;

  mockCursors.forEach(cursor => {
    cursor.image_path = image_path;
    cursor.is_custom = true;
  });

  return Promise.resolve(mockCursors);
}

function handleResetCursor(args: any) {
  const { cursor_name } = args;

  const cursor = mockCursors.find(c => c.name === cursor_name);
  if (!cursor) {
    return Promise.reject('Cursor not found');
  }

  cursor.image_path = '';
  cursor.is_custom = false;

  return Promise.resolve({ ...cursor });
}

function handleResetAllCursors() {
  mockCursors.forEach(cursor => {
    cursor.image_path = '';
    cursor.is_custom = false;
  });

  return Promise.resolve(mockCursors);
}

function handleBrowseCursorFile() {
  return Promise.resolve('C:\\test\\cursor.cur');
}

function handleReadCursorFile(args: any) {
  return Promise.resolve('data:image/png;base64,test');
}

async function renderAndWaitForLoad() {
  const { CursorCustomization } = await import('@/components/CursorCustomization');
  render(<CursorCustomization />);
  await waitFor(() => {
    expect(screen.getByTestId('cursors-loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('library-loaded')).toHaveTextContent('true');
  });
}

describe('CursorCustomization - Unit Tests - Rendering', () => {
  it('should render the component correctly', async () => {
    await renderAndWaitForLoad();

    expect(screen.getByTestId('cursor-customization')).toBeInTheDocument();
    expect(screen.getByTestId('cursors-loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('library-loaded')).toHaveTextContent('true');
  });

  it('should display all available cursors', async () => {
    const { useAppStore } = await import('@/store/useAppStore');
    useAppStore.setState({ customizationMode: 'advanced' });

    await renderAndWaitForLoad();

    expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    expect(screen.getByTestId('cursor-card-IBeam')).toBeInTheDocument();
    expect(screen.getByTestId('cursor-card-Hand')).toBeInTheDocument();
    expect(screen.getByTestId('cursor-card-Wait')).toBeInTheDocument();
  });

  it('should display library cursors', async () => {
    await renderAndWaitForLoad();

    expect(screen.getByTestId('library-card-lib_1')).toBeInTheDocument();
    expect(screen.getByTestId('library-card-lib_2')).toBeInTheDocument();
  });

  it('should show loading state initially', async () => {
    const { CursorCustomization } = await import('@/components/CursorCustomization');
    render(<CursorCustomization />);

    // Should show loading indicators
    expect(screen.getByTestId('loading-cursors')).toBeInTheDocument();
    expect(screen.getByTestId('loading-library')).toBeInTheDocument();
  });
});

describe('CursorCustomization - Unit Tests - Cursor Cards', () => {
  it('should render cursor cards with correct properties', async () => {
    await renderAndWaitForLoad();

    const normalCard = screen.getByTestId('cursor-card-Normal');
    expect(normalCard).toBeInTheDocument();
  });

  it('should show custom indicator for custom cursors', async () => {
    // Set one cursor as custom
    mockCursors[0].is_custom = true;

    await renderAndWaitForLoad();

    const normalCard = screen.getByTestId('cursor-card-Normal');
    expect(normalCard.querySelector('.cursor-preview')).toHaveClass('has-custom-cursor');
  });

  it('should handle cursor card click', async () => {
    await renderAndWaitForLoad();

    const normalCard = screen.getByTestId('cursor-card-Normal');

    fireEvent.click(normalCard);

    // Should select the cursor
    expect(screen.getByTestId('selected-cursor')).toHaveTextContent('Normal');
  });

  it('should show hotspot coordinates ONLY when showNames is true', async () => {
    // Add hotspot info to a cursor
    mockCursors[0].hotspot_x = 5;
    mockCursors[0].hotspot_y = 10;

    await renderAndWaitForLoad();

    const normalCard = screen.getByTestId('cursor-card-Normal');
    // By default, showNames is false, so hotspot should NOT be in the document
    expect(within(normalCard).queryByText('Hotspot: (5, 10)')).not.toBeInTheDocument();
  });

  it('should handle cursor card hover', async () => {
    await renderAndWaitForLoad();

    const normalCard = screen.getByTestId('cursor-card-Normal');

    fireEvent.mouseEnter(normalCard);

    // Should show hover state
    expect(normalCard).toHaveClass('hover');
  });

  it('should handle cursor card right-click', async () => {
    await renderAndWaitForLoad();

    const normalCard = screen.getByTestId('cursor-card-Normal');

    fireEvent.contextMenu(normalCard);

    // Should show context menu
    expect(screen.getByTestId('cursor-context-menu')).toBeInTheDocument();
  });
});
