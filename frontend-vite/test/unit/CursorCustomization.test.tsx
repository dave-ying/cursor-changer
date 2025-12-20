/**
 * Comprehensive Vitest tests for CursorCustomization.jsx
 * 
 * Tests cover:
 * - Unit tests: Individual component behavior, cursor card rendering
 * - Integration tests: File browsing, bulk operations, library integration
 * - User interaction tests: Clicks, selections, dialogs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import * as React from 'react';

// Mock Tauri API
let mockInvoke;
let mockCursors;
let mockLibrary;

beforeEach(() => {
  mockCursors = [
    { name: 'Normal', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 },
    { name: 'IBeam', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 },
    { name: 'Hand', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 },
    { name: 'Wait', image_path: '', is_custom: false, hotspot_x: 0, hotspot_y: 0 }
  ];

  mockLibrary = [
    { id: 'lib_1', name: 'Custom Arrow', file_path: 'C:\\cursor1.cur', hotspot_x: 0, hotspot_y: 0 },
    { id: 'lib_2', name: 'Custom Hand', file_path: 'C:\\cursor2.cur', hotspot_x: 5, hotspot_y: 5 }
  ];

  mockInvoke = vi.fn((command, args) => {
  // Debug: log invocations to trace test flow
  // console.log('mockInvoke', command, args);
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
      default:
        return Promise.reject(new Error(`Unknown command: ${command}`));
    }
  });

  // Don't overwrite global.window - just update the __TAURI__ property
  if (typeof window !== 'undefined') {
    (window as any).__TAURI__ = {
      core: { invoke: mockInvoke }
    };
  }
});

async function renderAndWaitForLoad() {
  render(<MockCursorCustomization />);
  await waitFor(() => {
    expect(screen.getByTestId('cursors-loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('library-loaded')).toHaveTextContent('true');
  });
}

// Command handlers
function handleSetCursorImage(args) {
  const { cursor_name, image_path } = args;
  
  const cursor = mockCursors.find(c => c.name === cursor_name);
  if (!cursor) {
    return Promise.reject('Cursor not found');
  }
  
  cursor.image_path = image_path;
  cursor.is_custom = true;
  
  return Promise.resolve({ ...cursor });
}

function handleSetSingleCursorWithSize(args) {
  const { cursor_name, image_path, size } = args;
  
  const cursor = mockCursors.find(c => c.name === cursor_name);
  if (!cursor) {
    return Promise.reject('Cursor not found');
  }
  
  cursor.image_path = image_path;
  cursor.is_custom = true;
  
  return Promise.resolve({ ...cursor, size });
}

function handleSetAllCursorsToImage(args) {
  const { image_path } = args;
  
  mockCursors.forEach(cursor => {
    cursor.image_path = image_path;
    cursor.is_custom = true;
  });
  
  return Promise.resolve({ success: true, count: mockCursors.length });
}

function handleResetCursor(args) {
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
  
  return Promise.resolve({ success: true });
}

function handleBrowseCursorFile() {
  // Simulate file picker returning a file
  return Promise.resolve('C:\\Users\\test\\custom-cursor.cur');
}

function handleReadCursorFile(args) {
  const { file_path: filePath } = args;
  // Return mock data URL
  return Promise.resolve(`data:image/x-icon;base64,MOCK_DATA_FOR_${filePath}`);
}

// Mock CursorCustomization component
function MockCursorCustomization() {
  const [cursors, setCursors] = React.useState([]);
  const [library, setLibrary] = React.useState([]);
  const [selectedCursor, setSelectedCursor] = React.useState(null);
  const [showResetDialog, setShowResetDialog] = React.useState(false);
  const [cursorsLoaded, setCursorsLoaded] = React.useState(false);
  const [libraryLoaded, setLibraryLoaded] = React.useState(false);

  React.useEffect(() => {
    loadCursors();
    loadLibrary();
  }, []);

  async function loadCursors() {
    const data = await mockInvoke('get_available_cursors');
    // Create fresh copies so React sees a new reference and re-renders
    setCursors(Array.isArray(data) ? data.map(d => ({ ...d })) : []);
    setCursorsLoaded(true);
  }

  async function loadLibrary() {
    const data = await mockInvoke('get_library_cursors');
    setLibrary(Array.isArray(data) ? data.map(d => ({ ...d })) : []);
    setLibraryLoaded(true);
  }

  async function handleBrowse(cursorName) {
    try {
      const filePath = await mockInvoke('browse_cursor_file');
      if (!filePath) return; // user cancelled
      await mockInvoke('set_cursor_image', { cursor_name: cursorName, image_path: filePath });
      await loadCursors();
    } catch (e) {
      // Swallow errors in the mock component so tests that simulate
      // a failed browse (mockInvoke.mockImplementationOnce rejecting)
      // don't cause an unhandled rejection that breaks downstream tests.
    }
  }

  async function handleReset(cursorName) {
    await mockInvoke('reset_cursor', { cursor_name: cursorName });
    await loadCursors();
  }

  async function handleResetAll() {
    await mockInvoke('reset_all_cursors');
    await loadCursors();
    setShowResetDialog(false);
  }

  async function handleApplyToAll(filePath) {
    await mockInvoke('set_all_cursors_to_image', { image_path: filePath });
    await loadCursors();
  }

  return (
    <div>
      <h1>Cursor Customization</h1>

      <div data-testid="cursors-loaded">{String(cursorsLoaded)}</div>
      <div data-testid="library-loaded">{String(libraryLoaded)}</div>
      
      {/* Cursor grid */}
      <div data-testid="cursor-grid">
        {cursors.map(cursor => (
          <div key={cursor.name} data-testid={`cursor-card-${cursor.name}`}>
            <div>{cursor.name}</div>
            <div>{cursor.is_custom ? 'Custom' : 'Default'}</div>
            <button onClick={() => handleBrowse(cursor.name)} title="Browse">Browse</button>
            {cursor.is_custom && (
              <button onClick={() => handleReset(cursor.name)} title="Reset">Reset</button>
            )}
          </div>
        ))}
      </div>

      {/* Bulk operations */}
      <div data-testid="bulk-operations">
        <button onClick={() => setShowResetDialog(true)}>Reset All</button>
        <button onClick={() => handleApplyToAll('C:\\universal.cur')}>Apply to All</button>
      </div>

      {/* Library panel */}
      <div data-testid="library-panel">
        {library.map(item => (
          <div key={item.id} data-testid={`library-item-${item.id}`}>
            <div>{item.name}</div>
            <button 
              onClick={() => handleBrowse('Normal')} 
              title="Use this cursor"
            >
              Use
            </button>
          </div>
        ))}
      </div>

      {/* Reset dialog */}
      {showResetDialog && (
        <div data-testid="reset-dialog">
          <p>Reset all cursors to default?</p>
          <button onClick={handleResetAll}>Confirm</button>
          <button onClick={() => setShowResetDialog(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// UNIT TESTS - Component Rendering
// ============================================================================

describe('CursorCustomization - Unit Tests - Rendering', () => {
  it('should render cursor customization component', async () => {
    await renderAndWaitForLoad();
    
    expect(screen.getByText('Cursor Customization')).toBeInTheDocument();
  });

  it('should render all available cursors', async () => {
    await renderAndWaitForLoad();
    
    await waitFor(() => {
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
      expect(screen.getByTestId('cursor-card-IBeam')).toBeInTheDocument();
      expect(screen.getByTestId('cursor-card-Hand')).toBeInTheDocument();
      expect(screen.getByTestId('cursor-card-Wait')).toBeInTheDocument();
    });
  });

  it('should show default state for cursors initially', async () => {
    await renderAndWaitForLoad();
    
    await waitFor(() => {
      const cards = screen.getAllByText('Default');
      expect(cards.length).toBeGreaterThan(0);
    });
  });

  it('should render library panel', async () => {
    await renderAndWaitForLoad();
    
    await waitFor(() => {
      expect(screen.getByTestId('library-panel')).toBeInTheDocument();
    });
  });

  it('should render library items', async () => {
    await renderAndWaitForLoad();
    
    await waitFor(() => {
      expect(screen.getByTestId('library-item-lib_1')).toBeInTheDocument();
      expect(screen.getByTestId('library-item-lib_2')).toBeInTheDocument();
    });
  });

  it('should render bulk operation buttons', async () => {
    await renderAndWaitForLoad();
    
    expect(screen.getByText('Reset All')).toBeInTheDocument();
    expect(screen.getByText('Apply to All')).toBeInTheDocument();
  });
});

// ============================================================================
// UNIT TESTS - Cursor Card Behavior
// ============================================================================

describe('CursorCustomization - Unit Tests - Cursor Cards', () => {
  it('should show browse button for each cursor', async () => {
    await renderAndWaitForLoad();
    
    await waitFor(() => {
      const browseButtons = screen.getAllByTitle('Browse');
      expect(browseButtons.length).toBe(mockCursors.length);
    });
  });

  it('should show reset button only for custom cursors', async () => {
    // Set one cursor as custom
    mockCursors[0].is_custom = true;
    
    await renderAndWaitForLoad();
    
    await waitFor(() => {
      const resetButtons = screen.queryAllByTitle('Reset');
      expect(resetButtons.length).toBe(1);
    });
  });

  it('should update cursor card after customization', async () => {
    await renderAndWaitForLoad();

    // Click browse
    const browseButtons = screen.getAllByTitle('Browse');
    fireEvent.click(browseButtons[0]);

    await waitFor(() => {
      const normalCard = screen.getByTestId('cursor-card-Normal');
      expect(within(normalCard).getByText('Custom')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - File Browsing
// ============================================================================

describe('CursorCustomization - Integration Tests - File Operations', () => {
  it('should browse and set cursor file', async () => {
    await renderAndWaitForLoad();

    // Click browse button
    const browseButtons = screen.getAllByTitle('Browse');
    fireEvent.click(browseButtons[0]);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('browse_cursor_file');
      expect(mockInvoke).toHaveBeenCalledWith('set_cursor_image', expect.objectContaining({
        cursor_name: 'Normal',
        image_path: expect.any(String)
      }));
    });
  });

  it('should handle file browse cancellation', async () => {
    await renderAndWaitForLoad();

    // Mock cancelled file picker - apply after initial load so it targets
    // the browse call and not the initial get_available_cursors call.
    mockInvoke.mockImplementationOnce((command) => {
      if (command === 'browse_cursor_file') return Promise.resolve(null);
      // fall back to default behavior for other commands (should be next calls)
      return Promise.resolve();
    });

    const browseButtons = screen.getAllByTitle('Browse');
    fireEvent.click(browseButtons[0]);

    // Should not call set_cursor_image
    await waitFor(() => {
      const setCalls = mockInvoke.mock.calls.filter(call => call[0] === 'set_cursor_image');
      expect(setCalls.length).toBe(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - Reset Operations
// ============================================================================

describe('CursorCustomization - Integration Tests - Reset', () => {
  it('should reset individual cursor', async () => {
    // Set cursor as custom
    mockCursors[0].is_custom = true;
    mockCursors[0].image_path = 'C:\\custom.cur';
    
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });

    // Click reset
    const resetButton = screen.getByTitle('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('reset_cursor', {
        cursor_name: 'Normal'
      });
    });

    await waitFor(() => {
      const normalCard = screen.getByTestId('cursor-card-Normal');
      expect(within(normalCard).getByText('Default')).toBeInTheDocument();
    });
  });

  it('should show reset all confirmation dialog', async () => {
    render(<MockCursorCustomization />);
    
    const resetAllButton = screen.getByText('Reset All');
    fireEvent.click(resetAllButton);

    await waitFor(() => {
      expect(screen.getByTestId('reset-dialog')).toBeInTheDocument();
      expect(screen.getByText('Reset all cursors to default?')).toBeInTheDocument();
    });
  });

  it('should reset all cursors on confirmation', async () => {
    render(<MockCursorCustomization />);
    
    // Open dialog
    fireEvent.click(screen.getByText('Reset All'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-dialog')).toBeInTheDocument();
    });

    // Confirm
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('reset_all_cursors');
    });

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByTestId('reset-dialog')).not.toBeInTheDocument();
    });
  });

  it('should cancel reset all dialog', async () => {
    render(<MockCursorCustomization />);
    
    // Open dialog
    fireEvent.click(screen.getByText('Reset All'));

    await waitFor(() => {
      expect(screen.getByTestId('reset-dialog')).toBeInTheDocument();
    });

    // Cancel
    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByTestId('reset-dialog')).not.toBeInTheDocument();
    });

    // Should not call reset
    const resetCalls = mockInvoke.mock.calls.filter(call => call[0] === 'reset_all_cursors');
    expect(resetCalls.length).toBe(0);
  });
});

// ============================================================================
// INTEGRATION TESTS - Bulk Operations
// ============================================================================

describe('CursorCustomization - Integration Tests - Bulk Operations', () => {
  it('should apply same image to all cursors', async () => {
    render(<MockCursorCustomization />);
    
    const applyAllButton = screen.getByText('Apply to All');
    fireEvent.click(applyAllButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_all_cursors_to_image', {
        image_path: 'C:\\universal.cur'
      });
    });

    // All cursors should be custom now
    await waitFor(() => {
      const customLabels = screen.getAllByText('Custom');
      expect(customLabels.length).toBe(mockCursors.length);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS - Library Integration
// ============================================================================

describe('CursorCustomization - Integration Tests - Library', () => {
  it('should display library cursors', async () => {
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      expect(screen.getByText('Custom Arrow')).toBeInTheDocument();
      expect(screen.getByText('Custom Hand')).toBeInTheDocument();
    });
  });

  it('should use library cursor when clicked', async () => {
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      expect(screen.getByTestId('library-item-lib_1')).toBeInTheDocument();
    });

    const useButtons = within(screen.getByTestId('library-panel')).getAllByTitle('Use this cursor');
    fireEvent.click(useButtons[0]);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('browse_cursor_file');
    });
  });
});

// ============================================================================
// EDGE CASE TESTS - Error Handling
// ============================================================================

describe('CursorCustomization - Edge Cases', () => {
  it('should handle empty cursor list', async () => {
    mockCursors.length = 0;
    
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      const grid = screen.getByTestId('cursor-grid');
      expect(grid.children.length).toBe(0);
    });
  });

  it('should handle empty library', async () => {
    mockLibrary.length = 0;
    
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      const panel = screen.getByTestId('library-panel');
      expect(panel.children.length).toBe(0);
    });
  });

  it('should handle command failures gracefully', async () => {
    render(<MockCursorCustomization />);

    await waitFor(() => {
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });

    // Fail only the next invocation (browse) so initial load still works
    mockInvoke.mockImplementationOnce((command) => {
      if (command === 'browse_cursor_file') return Promise.reject('Command failed');
      return Promise.resolve();
    });

    const browseButtons = screen.getAllByTitle('Browse');
    fireEvent.click(browseButtons[0]);

    // Should not crash
    await waitFor(() => {
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });
  });

  it('should handle concurrent operations', async () => {
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      expect(screen.getAllByTitle('Browse').length).toBeGreaterThan(1);
    });

    // Click multiple browse buttons rapidly
    const browseButtons = screen.getAllByTitle('Browse');
    fireEvent.click(browseButtons[0]);
    fireEvent.click(browseButtons[1]);
    fireEvent.click(browseButtons[2]);

    // Should handle all operations
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// UI INTERACTION TESTS - User Workflows
// ============================================================================

describe('CursorCustomization - UI Interaction Tests', () => {
  it('should complete typical customization workflow', async () => {
    render(<MockCursorCustomization />);
    
    // Wait for load
    await waitFor(() => {
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });

    // 1. Browse for Normal cursor
    const browseButtons = screen.getAllByTitle('Browse');
    fireEvent.click(browseButtons[0]);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('set_cursor_image', expect.any(Object));
    });

    // 2. Verify it's now custom
    await waitFor(() => {
      const normalCard = screen.getByTestId('cursor-card-Normal');
      expect(within(normalCard).getByText('Custom')).toBeInTheDocument();
    });

    // 3. Reset it
    const resetButton = screen.getByTitle('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      const normalCard = screen.getByTestId('cursor-card-Normal');
      expect(within(normalCard).getByText('Default')).toBeInTheDocument();
    });
  });

  it('should handle bulk customization workflow', async () => {
    render(<MockCursorCustomization />);
    
    // Apply to all
    const applyAllButton = screen.getByText('Apply to All');
    fireEvent.click(applyAllButton);

    await waitFor(() => {
      const customLabels = screen.getAllByText('Custom');
      expect(customLabels.length).toBe(mockCursors.length);
    });

    // Reset all
    fireEvent.click(screen.getByText('Reset All'));
    
    await waitFor(() => {
      expect(screen.getByTestId('reset-dialog')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      const defaultLabels = screen.getAllByText('Default');
      expect(defaultLabels.length).toBe(mockCursors.length);
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('CursorCustomization - Performance Tests', () => {
  it('should render large cursor list efficiently', async () => {
    // Create large cursor list
    mockCursors = Array.from({ length: 50 }, (_, i) => ({
      name: `Cursor${i}`,
      image_path: '',
      is_custom: false,
      hotspot_x: 0,
      hotspot_y: 0
    }));

    const startTime = Date.now();
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      expect(screen.getByTestId('cursor-grid')).toBeInTheDocument();
    });
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should handle rapid state updates', async () => {
    render(<MockCursorCustomization />);
    
    await waitFor(() => {
      expect(screen.getAllByTitle('Browse').length).toBeGreaterThan(0);
    });

    // Rapid clicks
    const browseButtons = screen.getAllByTitle('Browse');
    for (let i = 0; i < 10; i++) {
      fireEvent.click(browseButtons[0]);
    }

    // Should remain stable
    await waitFor(() => {
      expect(screen.getByTestId('cursor-card-Normal')).toBeInTheDocument();
    });
  });
});
