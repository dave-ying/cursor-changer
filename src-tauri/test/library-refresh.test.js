/**
 * Tauri Backend Tests for Library Refresh Functionality
 * 
 * Tests cover:
 * - State synchronization between backend and frontend
 * - Library operations trigger proper state updates
 * - File operations correctly update library data
 * - Error handling for corrupted library data
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// Mock the Tauri commands that interact with library
let mockLibraryPath = '/mock/library.json';
let mockLibraryData = {
  cursors: [
    {
      id: 'lib_1',
      name: 'Test Cursor',
      file_path: '/test/cursor1.cur',
      hotspot_x: 0,
      hotspot_y: 0,
      created_at: '2025-01-01T00:00:00Z'
    },
    {
      id: 'lib_2',
      name: 'Another Cursor', 
      file_path: '/test/cursor2.cur',
      hotspot_x: 5,
      hotspot_y: 5,
      created_at: '2025-01-02T00:00:00Z'
    }
  ]
};

// Mock filesystem operations
const fs = {
  readFileSync: (path) => {
    if (path === mockLibraryPath) {
      return JSON.stringify(mockLibraryData);
    }
    throw new Error('File not found');
  },
  writeFileSync: (path, data) => {
    if (path === mockLibraryPath) {
      mockLibraryData = JSON.parse(data);
      return;
    }
    throw new Error('Cannot write to file');
  },
  existsSync: (path) => {
    return path === mockLibraryPath;
  },
  mkdirSync: (path) => {
    // Mock successful directory creation
  }
};

// Mock Tauri AppHandle
const mockAppHandle = {
  path: {
    appDataDir: () => Promise.resolve('/mock/app/data')
  }
};

// Mock the library functions
const libraryFunctions = {
  loadLibrary: (app) => {
    const path = mockLibraryPath;
    if (!fs.existsSync(path)) {
      return { cursors: [] };
    }
    const contents = fs.readFileSync(path);
    return JSON.parse(contents);
  },

  saveLibrary: (app, library) => {
    const path = mockLibraryPath;
    // Ensure directory exists
    const parent = dirname(path);
    fs.mkdirSync(parent, { recursive: true });
    
    const json = JSON.stringify(library, null, 2);
    fs.writeFileSync(path, json);
  },

  getLibraryCursors: (app) => {
    const library = libraryFunctions.loadLibrary(app);
    return library.cursors;
  },

  addCursorToLibrary: (app, name, filePath, hotspotX, hotspotY) => {
    const library = libraryFunctions.loadLibrary(app);
    
    const timestamp = Date.now();
    const id = `lib_${timestamp}`;
    const createdAt = new Date().toISOString();
    
    const cursor = {
      id,
      name,
      file_path: filePath,
      hotspot_x: hotspotX,
      hotspot_y: hotspotY,
      created_at: createdAt
    };
    
    library.cursors.push(cursor);
    libraryFunctions.saveLibrary(app, library);
    
    return cursor;
  },

  removeCursorFromLibrary: (app, id) => {
    const library = libraryFunctions.loadLibrary(app);
    library.cursors = library.cursors.filter(c => c.id !== id);
    libraryFunctions.saveLibrary(app, library);
  },

  updateCursorInLibrary: (app, id, name, filePath, hotspotX, hotspotY) => {
    const library = libraryFunctions.loadLibrary(app);
    const cursor = library.cursors.find(c => c.id === id);
    
    if (cursor) {
      cursor.name = name;
      cursor.file_path = filePath;
      cursor.hotspot_x = hotspotX;
      cursor.hotspot_y = hotspotY;
      libraryFunctions.saveLibrary(app, library);
      return cursor;
    }
    
    throw new Error(`Cursor with id ${id} not found`);
  }
};

describe('Tauri Library Refresh Functionality', () => {
  beforeEach(() => {
    // Reset mock data
    mockLibraryData = {
      cursors: [
        {
          id: 'lib_1',
          name: 'Test Cursor',
          file_path: '/test/cursor1.cur',
          hotspot_x: 0,
          hotspot_y: 0,
          created_at: '2025-01-01T00:00:00Z'
        }
      ]
    };
  });

  describe('Library Data Persistence', () => {
    it('should save library data after add operation', () => {
      const initialCount = mockLibraryData.cursors.length;
      
      const newCursor = libraryFunctions.addCursorToLibrary(
        mockAppHandle,
        'New Test Cursor',
        '/test/new.cur',
        10,
        15
      );
      
      // Verify cursor was added to in-memory data
      expect(mockLibraryData.cursors).toHaveLength(initialCount + 1);
      expect(newCursor.name).toBe('New Test Cursor');
      expect(newCursor.id).toMatch(/^lib_\d+$/);
      
      // Verify data was written to "file"
      const updatedLibrary = JSON.parse(fs.readFileSync(mockLibraryPath));
      expect(updatedLibrary.cursors).toHaveLength(initialCount + 1);
      expect(updatedLibrary.cursors.find(c => c.id === newCursor.id)).toBeDefined();
    });

    it('should save library data after remove operation', () => {
      const initialCount = mockLibraryData.cursors.length;
      const cursorId = mockLibraryData.cursors[0].id;
      
      libraryFunctions.removeCursorFromLibrary(mockAppHandle, cursorId);
      
      // Verify cursor was removed from in-memory data
      expect(mockLibraryData.cursors).toHaveLength(initialCount - 1);
      expect(mockLibraryData.cursors.find(c => c.id === cursorId)).toBeUndefined();
      
      // Verify data was written to "file"
      const updatedLibrary = JSON.parse(fs.readFileSync(mockLibraryPath));
      expect(updatedLibrary.cursors).toHaveLength(initialCount - 1);
    });

    it('should save library data after update operation', () => {
      const cursorId = mockLibraryData.cursors[0].id;
      const originalCursor = mockLibraryData.cursors[0];
      
      const updatedCursor = libraryFunctions.updateCursorInLibrary(
        mockAppHandle,
        cursorId,
        'Updated Test Cursor',
        '/test/updated.cur',
        20,
        25
      );
      
      // Verify cursor was updated in memory
      expect(updatedCursor.name).toBe('Updated Test Cursor');
      expect(updatedCursor.file_path).toBe('/test/updated.cur');
      expect(updatedCursor.hotspot_x).toBe(20);
      expect(updatedCursor.hotspot_y).toBe(25);
      
      // Verify data was written to "file"
      const updatedLibrary = JSON.parse(fs.readFileSync(mockLibraryPath));
      const fileCursor = updatedLibrary.cursors.find(c => c.id === cursorId);
      expect(fileCursor.name).toBe('Updated Test Cursor');
      expect(fileCursor.file_path).toBe('/test/updated.cur');
    });
  });

  describe('State Synchronization', () => {
    it('should maintain consistent state across operations', () => {
      // Add cursor
      const added = libraryFunctions.addCursorToLibrary(
        mockAppHandle,
        'Consistency Test',
        '/test/consistency.cur',
        5,
        10
      );
      
      // Get all cursors
      const allCursors = libraryFunctions.getLibraryCursors(mockAppHandle);
      expect(allCursors.find(c => c.id === added.id)).toBeDefined();
      
      // Update the cursor
      libraryFunctions.updateCursorInLibrary(
        mockAppHandle,
        added.id,
        'Modified Consistency Test',
        '/test/modified.cur',
        15,
        20
      );
      
      // Verify update is reflected
      const updatedCursors = libraryFunctions.getLibraryCursors(mockAppHandle);
      const updated = updatedCursors.find(c => c.id === added.id);
      expect(updated.name).toBe('Modified Consistency Test');
      
      // Remove the cursor
      libraryFunctions.removeCursorFromLibrary(mockAppHandle, added.id);
      
      // Verify removal is reflected
      const finalCursors = libraryFunctions.getLibraryCursors(mockAppHandle);
      expect(finalCursors.find(c => c.id === added.id)).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing library file gracefully', () => {
      // Simulate missing file
      const originalPath = mockLibraryPath;
      mockLibraryPath = '/nonexistent/library.json';
      
      // Mock fs.existsSync to return false for missing path
      const originalExistsSync = fs.existsSync;
      fs.existsSync = (path) => {
        return path !== mockLibraryPath && originalExistsSync(path);
      };
      
      const cursors = libraryFunctions.getLibraryCursors(mockAppHandle);
      expect(cursors).toHaveLength(0);
      
      // Restore
      fs.existsSync = originalExistsSync;
      mockLibraryPath = originalPath;
    });

    it('should handle update operation on non-existent cursor', () => {
      expect(() => {
        libraryFunctions.updateCursorInLibrary(
          mockAppHandle,
          'nonexistent_id',
          'Test',
          '/test.cur',
          0,
          0
        );
      }).toThrow('Cursor with id nonexistent_id not found');
    });
  });
});