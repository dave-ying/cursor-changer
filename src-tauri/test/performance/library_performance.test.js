import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock Tauri API
let mockInvoke;
let mockFs;
let mockPath;

// Mock library data
const mockLibraryData = {
  cursors: []
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
      case 'add_cursor_to_library':
        return handleAddCursorToLibrary(args);
      case 'get_library_cursor_preview':
        return handleGetLibraryCursorPreview(args);
      case 'export_library_cursors':
        return handleExportLibraryCursors(args);
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

function handleGetLibraryCursorPreview(args) {
  const { file_path } = args;

  if (file_path.includes('non/existent')) {
    return Promise.reject(new Error('File not found'));
  }

  // Mock file extension detection
  const ext = path.extname(file_path).toLowerCase();

  if (ext === '.svg') {
    // Return PNG data for SVG preview
    return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  }

  if (ext === '.cur' || ext === '.ico' || ext === '.ani') {
    // Mock cursor preview data
    return Promise.resolve('data:image/x-icon;base64,AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA');
  }

  return Promise.reject('Unknown file type');
}

function handleExportLibraryCursors(args) {
  if (mockLibraryData.cursors.length === 0) {
    return Promise.reject(new Error('No cursors in library to export'));
  }
  return Promise.resolve('/mock/export/path/library.zip');
}

// ============================================================================
// PERFORMANCE TESTS - Library Operations
// ============================================================================

describe('Performance Tests - Library Operations', () => {
  it('should handle large library efficiently', async () => {
    const startTime = Date.now();

    // Add 100 cursors
    const additions = Array.from({ length: 100 }, (_, i) =>
      mockInvoke('add_cursor_to_library', {
        name: `Cursor ${i}`,
        file_path: `/test/cursor${i}.cur`,
        hotspot_x: i % 16,
        hotspot_y: i % 16
      })
    );

    await Promise.all(additions);

    const endTime = Date.now();

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(1000);

    // Verify all cursors were added
    const cursors = await mockInvoke('get_library_cursors');
    expect(cursors).toHaveLength(100);
  });

  it('should generate previews efficiently', async () => {
    const startTime = Date.now();

    // Generate previews for multiple files
    const previews = Array.from({ length: 10 }, (_, i) =>
      mockInvoke('get_library_cursor_preview', {
        file_path: `/test/cursor${i}.cur`
      })
    );

    await Promise.all(previews);

    const endTime = Date.now();

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(500);
  });

  it('should handle library export efficiently', async () => {
    // Add some cursors first
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        mockInvoke('add_cursor_to_library', {
          name: `Export Test ${i}`,
          file_path: `/test/export${i}.cur`,
          hotspot_x: 0,
          hotspot_y: 0
        })
      )
    );

    const startTime = Date.now();

    const exportPath = await mockInvoke('export_library_cursors');

    const endTime = Date.now();

    expect(exportPath).toBeDefined();
    expect(endTime - startTime).toBeLessThan(1000);
  });
});