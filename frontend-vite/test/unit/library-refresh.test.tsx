/**
 * Vitest tests for library refresh functionality
 * 
 * Tests cover:
 * - HotspotPicker delete handler refresh
 * - State synchronization after library operations
 * - BrowseModal file type routing (.CUR/.ANI vs images)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock Tauri API
let mockInvoke;
let mockLibrary;

beforeEach(() => {
  mockLibrary = [
    { id: 'lib_1', name: 'Custom Arrow', file_path: 'C:\\cursor1.cur', hotspot_x: 0, hotspot_y: 0 },
    { id: 'lib_2', name: 'Custom Hand', file_path: 'C:\\cursor2.cur', hotspot_x: 5, hotspot_y: 5 },
    { id: 'lib_3', name: 'Test Cursor', file_path: 'C:\\cursor3.ani', hotspot_x: 10, hotspot_y: 10 }
  ];

  mockInvoke = vi.fn((command, args) => {
    switch (command) {
      case 'get_library_cursors':
        return Promise.resolve([...mockLibrary]);
      case 'remove_cursor_from_library':
        return handleRemoveCursor(args);
      case 'add_uploaded_cursor_to_library':
        return handleAddCursor(args);
      case 'get_available_cursors':
        return Promise.resolve([]);
      default:
        return Promise.reject(new Error(`Unknown command: ${command}`));
    }
  });

  // Ensure we do NOT replace the global window object provided by the test environment (JSDOM).
  // Instead, set the __TAURI__ property on the existing window object.
  if (typeof (globalThis as any).window === 'undefined') {
    // If the test environment didn't provide a window, create a minimal one
    (globalThis as any).window = {};
  }
  (globalThis as any).window.__TAURI__ = {
    core: { invoke: mockInvoke }
  };

  // Ensure the mocked app context picks up the current mockInvoke instance
  mockAppContext.invoke = mockInvoke;
});

function handleRemoveCursor(args) {
  const { id } = args;
  const index = mockLibrary.findIndex(item => item.id === id);
  if (index === -1) {
    return Promise.reject(new Error('Cursor not found'));
  }
  mockLibrary.splice(index, 1);
  return Promise.resolve({ success: true });
}

function handleAddCursor(args) {
  const { filename } = args;
  const newCursor = {
    id: `lib_${Date.now()}`,
    name: filename,
    file_path: `C:\\${filename}`,
    hotspot_x: 0,
    hotspot_y: 0
  };
  mockLibrary.push(newCursor);
  return Promise.resolve(newCursor);
}

// Mock AppContext
const mockAppContext = {
  invoke: mockInvoke,
  showMessage: vi.fn(),
  loadLibraryCursors: vi.fn(() => Promise.resolve()),
  loadAvailableCursors: vi.fn(() => Promise.resolve())
};

vi.mock('@/context/AppContext', () => ({
  useApp: () => mockAppContext
}));

// Mock HotspotPicker component
function MockHotspotPicker({ file, filePath, itemId, onCancel, onComplete }) {
  const [busy, setBusy] = React.useState(false);
  const { invoke, showMessage, loadLibraryCursors } = mockAppContext;

  const handleDelete = async () => {
    if (!itemId) return;
    setBusy(true);
    try {
      await invoke('remove_cursor_from_library', { id: itemId });
      showMessage(`Deleted from library`, 'success');
      await loadLibraryCursors();
      if (onComplete) onComplete();
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.error('Failed to delete cursor:', err);
      showMessage('Failed to delete cursor: ' + msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!file && !filePath && !itemId) return null;

  return (
    <div data-testid="hotspot-picker">
      <h2>Edit {file?.name || 'cursor'}</h2>
      <button 
        onClick={handleDelete} 
        disabled={busy}
        data-testid="delete-button"
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      <button onClick={onCancel} data-testid="cancel-button">Cancel</button>
    </div>
  );
}

// Mock BrowseModal component
function MockBrowseModal({ isOpen, onClose, onImageFileSelected, handleFileSelect, hotspotItemId }) {
  if (!isOpen) return null;

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name || '';
    const ext = (name.split('.').pop() || '').toLowerCase();

    // For image files, bubble up to parent so it can open HotspotPicker
    const supportedImages = ['svg', 'png', 'ico', 'bmp', 'jpg', 'jpeg'];
    if (supportedImages.includes(ext)) {
      onImageFileSelected?.(file, hotspotItemId);
      onClose?.();
      return;
    }

    // For .cur / .ani files, call the parent's handleFileSelect to process them
    if (handleFileSelect) {
      handleFileSelect(event);
    } else {
      console.warn('handleFileSelect function not provided to BrowseModal');
    }
    onClose?.();
  };

  return (
    <div data-testid="browse-modal">
      <h2>Add Cursor</h2>
      <input 
        type="file" 
        accept=".cur,.ani,.svg,.png,.ico,.bmp,.jpg,.jpeg"
        onChange={handleFileChange}
        data-testid="file-input"
      />
      <button onClick={onClose} data-testid="close-button">Close</button>
    </div>
  );
}

// Test wrapper component
function TestWrapper() {
  const [showHotspotPicker, setShowHotspotPicker] = React.useState(false);
  const [hotspotFile, setHotspotFile] = React.useState(null);
  const [hotspotItemId, setHotspotItemId] = React.useState(null);
  const [showBrowseModal, setShowBrowseModal] = React.useState(false);

  const handleFileSelect = React.useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name || '';
    const ext = (name.split('.').pop() || '').toLowerCase();

    if (ext === 'cur' || ext === 'ani') {
      // Handle cursor files - add to library
      mockInvoke('add_uploaded_cursor_to_library', { 
        filename: file.name, 
        data: [1, 2, 3] // Mock data
      }).then(() => {
        mockAppContext.loadLibraryCursors();
      });
    } else {
      // Handle image files - open hotspot picker
      setHotspotFile(file);
      setShowHotspotPicker(true);
    }
  }, []);

  return (
    <div>
      <div data-testid="library-list">
        {mockLibrary.map(item => (
          <div key={item.id} data-testid={`library-item-${item.id}`}>
            <span>{item.name}</span>
            <button 
              onClick={() => {
                setHotspotItemId(item.id);
                setShowHotspotPicker(true);
              }}
              data-testid="edit-button"
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      <button 
        onClick={() => setShowBrowseModal(true)}
        data-testid="add-button"
      >
        Add Cursor
      </button>

      <MockBrowseModal
        isOpen={showBrowseModal}
        onClose={() => setShowBrowseModal(false)}
        onImageFileSelected={(file, itemId) => {
          setHotspotFile(file);
          setHotspotItemId(itemId);
          setShowHotspotPicker(true);
        }}
        handleFileSelect={handleFileSelect}
        hotspotItemId={hotspotItemId}
      />

      {showHotspotPicker && (
        <MockHotspotPicker
          file={hotspotFile}
          filePath={null}
          itemId={hotspotItemId}
          onCancel={() => {
            setShowHotspotPicker(false);
            setHotspotFile(null);
            setHotspotItemId(null);
          }}
          onComplete={() => {
            setShowHotspotPicker(false);
            setHotspotFile(null);
            setHotspotItemId(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// TESTS - Library Refresh Functionality
// ============================================================================

describe('Library Refresh Functionality', () => {
  it('should refresh library after HotspotPicker delete', async () => {
    render(<TestWrapper />);
    
    // Wait for library to load
    await waitFor(() => {
      expect(screen.getByTestId('library-item-lib_1')).toBeInTheDocument();
    });

    // Click edit button to open HotspotPicker
    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('remove_cursor_from_library', { id: 'lib_1' });
    });

    await waitFor(() => {
      expect(mockAppContext.loadLibraryCursors).toHaveBeenCalled();
    });

    // Item should be removed from UI
    await waitFor(() => {
      expect(screen.queryByTestId('library-item-lib_1')).not.toBeInTheDocument();
    });
  });

  it('should call loadLibraryCursors after cursor deletion', async () => {
    render(<TestWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId('library-item-lib_1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });

    // Reset call count
    mockAppContext.loadLibraryCursors.mockClear();
    
    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockAppContext.loadLibraryCursors).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// TESTS - BrowseModal File Type Routing
// ============================================================================

describe('BrowseModal File Type Routing', () => {
  it('should route .cur files through handleFileSelect', async () => {
    render(<TestWrapper />);
    
    // Open browse modal
    const addButton = screen.getByTestId('add-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('browse-modal')).toBeInTheDocument();
    });

    // Create a mock .cur file
    const file = new File(['cur data'], 'test.cur', { type: 'application/octet-stream' });
    const fileInput = screen.getByTestId('file-input');
    
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('add_uploaded_cursor_to_library', expect.objectContaining({
        filename: 'test.cur'
      }));
    });

    await waitFor(() => {
      expect(mockAppContext.loadLibraryCursors).toHaveBeenCalled();
    });

    // HotspotPicker should NOT be opened
    expect(screen.queryByTestId('hotspot-picker')).not.toBeInTheDocument();
  });

  it('should route .ani files through handleFileSelect', async () => {
    render(<TestWrapper />);
    
    const addButton = screen.getByTestId('add-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('browse-modal')).toBeInTheDocument();
    });

    // Create a mock .ani file
    const file = new File(['ani data'], 'test.ani', { type: 'application/octet-stream' });
    const fileInput = screen.getByTestId('file-input');
    
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('add_uploaded_cursor_to_library', expect.objectContaining({
        filename: 'test.ani'
      }));
    });

    await waitFor(() => {
      expect(mockAppContext.loadLibraryCursors).toHaveBeenCalled();
    });
  });

  it('should route .png files through onImageFileSelected (hotspot picker)', async () => {
    render(<TestWrapper />);
    
    const addButton = screen.getByTestId('add-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('browse-modal')).toBeInTheDocument();
    });

    // Create a mock .png file
    const file = new File(['png data'], 'test.png', { type: 'image/png' });
    const fileInput = screen.getByTestId('file-input');
    
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fireEvent.change(fileInput);

    // Should open HotspotPicker
    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });

    // Should NOT call add_uploaded_cursor_to_library
    const addCalls = mockInvoke.mock.calls.filter(call => call[0] === 'add_uploaded_cursor_to_library');
    expect(addCalls.length).toBe(0);
  });

  it('should route .svg files through onImageFileSelected (hotspot picker)', async () => {
    render(<TestWrapper />);
    
    const addButton = screen.getByTestId('add-button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByTestId('browse-modal')).toBeInTheDocument();
    });

    // Create a mock .svg file
    const file = new File(['<svg></svg>'], 'test.svg', { type: 'image/svg+xml' });
    const fileInput = screen.getByTestId('file-input');
    
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fireEvent.change(fileInput);

    // Should open HotspotPicker
    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TESTS - State Synchronization
// ============================================================================

describe('State Synchronization', () => {
  it('should maintain UI consistency after library operations', async () => {
    render(<TestWrapper />);
    
    // Initial state: 3 items
    await waitFor(() => {
      expect(screen.getByTestId('library-item-lib_1')).toBeInTheDocument();
      expect(screen.getByTestId('library-item-lib_2')).toBeInTheDocument();
      expect(screen.getByTestId('library-item-lib_3')).toBeInTheDocument();
    });

    // Delete one item
    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    // Wait for UI to update - should show 2 items now
    await waitFor(() => {
      expect(screen.queryByTestId('library-item-lib_1')).not.toBeInTheDocument();
      expect(screen.getByTestId('library-item-lib_2')).toBeInTheDocument();
      expect(screen.getByTestId('library-item-lib_3')).toBeInTheDocument();
    });
  });

  it('should handle concurrent library operations', async () => {
    render(<TestWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId('library-item-lib_1')).toBeInTheDocument();
    });

    // Open multiple edit dialogs
    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);
    fireEvent.click(editButtons[1]);

    // Should handle gracefully
    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// TESTS - Error Handling
// ============================================================================

describe('Error Handling', () => {
  it('should handle delete failure gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Mock delete to fail
    mockInvoke.mockImplementationOnce((command, args) => {
      if (command === 'remove_cursor_from_library') {
        return Promise.reject(new Error('Delete failed'));
      }
      return Promise.resolve([...mockLibrary]);
    });

    render(<TestWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId('library-item-lib_1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTestId('edit-button');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId('delete-button');
    fireEvent.click(deleteButton);

    // Should show error but not crash
    await waitFor(() => {
      expect(mockAppContext.showMessage).toHaveBeenCalledWith(
        'Failed to delete cursor: Delete failed',
        'error'
      );
    });

    // UI should still be stable
    await waitFor(() => {
      expect(screen.getByTestId('hotspot-picker')).toBeInTheDocument();
    });
  });
});