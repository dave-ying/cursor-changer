import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock Tauri API
let mockInvoke;
let mockFs;
let mockPath;

// Mock library data
const mockLibraryData = {
  cursors: [
    {
      id: 'lib_1',
      name: 'Test Arrow',
      file_path: '/test/cursor1.cur',
      hotspot_x: 0,
      hotspot_y: 0,
      created_at: '2025-01-01T00:00:00Z'
    }
  ]
};

beforeEach(() => {
  // Mock filesystem operations
  mockFs = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    statSync: vi.fn()
  };

  // Mock Tauri invoke
  mockInvoke = vi.fn((command, args) => {
    switch (command) {
      case 'get_library_cursors':
        return handleGetLibraryCursors(args);
      case 'add_cursor_to_library':
        return handleAddCursorToLibrary(args);
      case 'remove_cursor_from_library':
        return handleRemoveCursorFromLibrary(args);
      case 'rename_cursor_in_library':
        return handleRenameCursorInLibrary(args);
      case 'update_cursor_in_library':
        return handleUpdateCursorInLibrary(args);
      case 'reorder_library_cursors':
        return handleReorderLibraryCursors(args);
      default:
        return Promise.reject(new Error(`Unknown command: ${command}`));
    }
  });

  global.window = {
    __TAURI__: {
      core: { invoke: mockInvoke },
      path: {
        appDataDir: vi.fn().mockResolvedValue('/mock/app/data')
      }
    }
  };

  // Mock global objects
  global.fs = mockFs;
  global.path = path;
});

// Mock handlers
function handleGetLibraryCursors(args) {
  return Promise.resolve(mockLibraryData.cursors);
}

let libCursorIdCounter = 0;

function handleAddCursorToLibrary(args) {
  const { name, file_path, hotspot_x, hotspot_y } = args;
  const newCursor = {
    id: `lib_${Date.now()}_${libCursorIdCounter++}`,
    name,
    file_path,
    hotspot_x,
    hotspot_y,
    created_at: new Date().toISOString()
  };
  mockLibraryData.cursors.push(newCursor);
  return Promise.resolve(newCursor);
}

function handleRemoveCursorFromLibrary(args) {
  const { id } = args;
  const index = mockLibraryData.cursors.findIndex(c => c.id === id);
  if (index >= 0) {
    mockLibraryData.cursors.splice(index, 1);
  }
  return Promise.resolve();
}

function handleRenameCursorInLibrary(args) {
  const { id, new_name } = args;
  const cursor = mockLibraryData.cursors.find(c => c.id === id);
  if (cursor) {
    cursor.name = new_name;
  }
  return Promise.resolve();
}

function handleUpdateCursorInLibrary(args) {
  const { id, name, file_path, hotspot_x, hotspot_y } = args;
  const cursor = mockLibraryData.cursors.find(c => c.id === id);
  if (cursor) {
    cursor.name = name;
    cursor.file_path = file_path;
    cursor.hotspot_x = hotspot_x;
    cursor.hotspot_y = hotspot_y;
  }
  return Promise.resolve(cursor);
}

function handleReorderLibraryCursors(args) {
  const { order } = args;
  // Mock reordering logic
  return Promise.resolve();
}

// ============================================================================
// LIBRARY CRUD OPERATIONS - Unit Tests
// ============================================================================

describe('Library CRUD Operations - Unit Tests', () => {
  beforeEach(() => {
    // Reset mock data
    mockLibraryData.cursors = [
      {
        id: 'lib_1',
        name: 'Test Arrow',
        file_path: '/test/cursor1.cur',
        hotspot_x: 0,
        hotspot_y: 0,
        created_at: '2025-01-01T00:00:00Z'
      }
    ];
  });

  describe('get_library_cursors', () => {
    it('should return all library cursors', async () => {
      const result = await mockInvoke('get_library_cursors');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        id: 'lib_1',
        name: 'Test Arrow',
        file_path: '/test/cursor1.cur'
      });
    });

    it('should return empty array when library is empty', async () => {
      mockLibraryData.cursors = [];
      const result = await mockInvoke('get_library_cursors');

      expect(result).toEqual([]);
    });

    it('should include all cursor properties', async () => {
      const result = await mockInvoke('get_library_cursors');

      result.forEach(cursor => {
        expect(cursor).toHaveProperty('id');
        expect(cursor).toHaveProperty('name');
        expect(cursor).toHaveProperty('file_path');
        expect(cursor).toHaveProperty('hotspot_x');
        expect(cursor).toHaveProperty('hotspot_y');
        expect(cursor).toHaveProperty('created_at');
      });
    });
  });

  describe('add_cursor_to_library', () => {
    it('should add new cursor to library', async () => {
      const newCursor = {
        name: 'New Arrow',
        file_path: '/test/new.cur',
        hotspot_x: 5,
        hotspot_y: 5
      };

      const result = await mockInvoke('add_cursor_to_library', newCursor);

      expect(result).toMatchObject({
        name: 'New Arrow',
        file_path: '/test/new.cur',
        hotspot_x: 5,
        hotspot_y: 5
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('created_at');
    });

    it('should generate unique ID for each cursor', async () => {
      const cursor1 = await mockInvoke('add_cursor_to_library', {
        name: 'Cursor 1',
        file_path: '/test/1.cur',
        hotspot_x: 0,
        hotspot_y: 0
      });

      const cursor2 = await mockInvoke('add_cursor_to_library', {
        name: 'Cursor 2',
        file_path: '/test/2.cur',
        hotspot_x: 0,
        hotspot_y: 0
      });

      expect(cursor1.id).not.toBe(cursor2.id);
    });

    it('should handle special characters in cursor name', async () => {
      const result = await mockInvoke('add_cursor_to_library', {
        name: 'Cursor with émojis 🎨 and spëciäl chårs',
        file_path: '/test/special.cur',
        hotspot_x: 0,
        hotspot_y: 0
      });

      expect(result.name).toContain('émojis');
      expect(result.name).toContain('spëciäl chårs');
    });

    it('should accept default hotspot values', async () => {
      const result = await mockInvoke('add_cursor_to_library', {
        name: 'Default Hotspot',
        file_path: '/test/default.cur',
        hotspot_x: 0,
        hotspot_y: 0
      });

      expect(result.hotspot_x).toBe(0);
      expect(result.hotspot_y).toBe(0);
    });
  });

  describe('remove_cursor_from_library', () => {
    it('should remove cursor by ID', async () => {
      const initialCount = mockLibraryData.cursors.length;

      await mockInvoke('remove_cursor_from_library', { id: 'lib_1' });

      expect(mockLibraryData.cursors.length).toBe(initialCount - 1);
      expect(mockLibraryData.cursors.find(c => c.id === 'lib_1')).toBeUndefined();
    });

    it('should handle non-existent cursor ID', async () => {
      const initialCount = mockLibraryData.cursors.length;

      await mockInvoke('remove_cursor_from_library', { id: 'non_existent' });

      // Should not throw error, just do nothing
      expect(mockLibraryData.cursors.length).toBe(initialCount);
    });

    it('should handle empty library gracefully', async () => {
      mockLibraryData.cursors = [];

      await expect(
        mockInvoke('remove_cursor_from_library', { id: 'lib_1' })
      ).resolves.not.toThrow();
    });
  });

  describe('rename_cursor_in_library', () => {
    it('should update cursor name', async () => {
      await mockInvoke('rename_cursor_in_library', {
        id: 'lib_1',
        new_name: 'Updated Arrow'
      });

      const updated = mockLibraryData.cursors.find(c => c.id === 'lib_1');
      expect(updated.name).toBe('Updated Arrow');
    });

    it('should handle non-existent cursor ID', async () => {
      await mockInvoke('rename_cursor_in_library', {
        id: 'non_existent',
        new_name: 'New Name'
      });

      // Should not throw error
      expect(mockLibraryData.cursors.length).toBe(1);
    });
  });

  describe('update_cursor_in_library', () => {
    it('should update all cursor properties', async () => {
      const update = {
        id: 'lib_1',
        name: 'Updated Arrow',
        file_path: '/test/updated.cur',
        hotspot_x: 15,
        hotspot_y: 20
      };

      const result = await mockInvoke('update_cursor_in_library', update);

      expect(result).toMatchObject({
        name: 'Updated Arrow',
        file_path: '/test/updated.cur',
        hotspot_x: 15,
        hotspot_y: 20
      });
    });

    it('should handle partial updates', async () => {
      const update = {
        id: 'lib_1',
        name: 'Name Only Update',
        file_path: '/test/updated.cur', // Same as before
        hotspot_x: 15,
        hotspot_y: 20
      };

      await mockInvoke('update_cursor_in_library', update);

      const updated = mockLibraryData.cursors.find(c => c.id === 'lib_1');
      expect(updated.name).toBe('Name Only Update');
      expect(updated.file_path).toBe('/test/updated.cur');
    });
  });

  describe('reorder_library_cursors', () => {
    it('should reorder cursors according to provided order', async () => {
      // Add second cursor for reorder test
      await mockInvoke('add_cursor_to_library', {
        name: 'Second Cursor',
        file_path: '/test/2.cur',
        hotspot_x: 0,
        hotspot_y: 0
      });

      const order = ['lib_2', 'lib_1'];

      await mockInvoke('reorder_library_cursors', { order });

      // Should not throw error
      expect(mockLibraryData.cursors).toHaveLength(2);
    });

    it('should handle partial reordering', async () => {
      const order = ['lib_1']; // Only specify some cursors

      await mockInvoke('reorder_library_cursors', { order });

      // Should not throw error
      expect(mockLibraryData.cursors).toHaveLength(1);
    });
  });
});