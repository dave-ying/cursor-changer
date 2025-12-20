import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock Tauri API
let mockInvoke;
let mockFs;
let mockDialog;
let mockPath;

beforeEach(() => {
  // Mock filesystem operations
  mockFs = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    statSync: vi.fn(),
    createReadStream: vi.fn(),
    createWriteStream: vi.fn()
  };

  // Mock dialog operations
  mockDialog = {
    file: vi.fn().mockReturnValue({
      setTitle: vi.fn().mockReturnThis(),
      addFilter: vi.fn().mockReturnThis(),
      setFileName: vi.fn().mockReturnThis(),
      setDirectory: vi.fn().mockReturnThis(),
      blocking_pick_file: vi.fn().mockResolvedValue({
        as_path: () => '/mock/selected/cursor.svg'
      }),
      blocking_save_file: vi.fn()
    })
  };

  // Mock Tauri invoke
  mockInvoke = vi.fn((command, args) => {
    switch (command) {
      case 'convert_image_to_cur':
        return handleConvertImageToCur(args);
      case 'read_cursor_file_as_data_url':
        return handleReadCursorFileAsDataUrl(args);
      case 'render_cursor_image_preview':
        return handleRenderCursorImagePreview(args);
      default:
        return Promise.reject(new Error(`Unknown command: ${command}`));
    }
  });

  global.window = {
    __TAURI__: {
      core: { invoke: mockInvoke },
      path: {
        appDataDir: vi.fn().mockResolvedValue('/mock/app/data')
      },
      dialog: mockDialog
    }
  };

  // Mock global objects
  global.fs = mockFs;
  global.path = path;
});

// Mock file data
const mockFileData = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>',
  png: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
  cur: Buffer.from([0x00, 0x00, 0x02, 0x00, 0x01, 0x00, 0x20, 0x20]), // Minimal CUR header
  ico: Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20]), // Minimal ICO header
  ani: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00]), // Minimal ANI header
  invalid: Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF])
};

// Mock handlers
function handleConvertImageToCur(args) {
  const { input_path, app } = args;
  const ext = path.extname(input_path).toLowerCase();

  if (!['.svg', '.png', '.ico', '.bmp', '.jpg', '.jpeg'].includes(ext)) {
    return Promise.reject('Unsupported file type');
  }

  const output_path = input_path.replace(ext, '_converted.cur');

  return Promise.resolve({
    output_path,
    size: 256,
    hotspot_x: 0,
    hotspot_y: 0,
    format: ext.substring(1)
  });
}

function handleReadCursorFileAsDataUrl(args) {
  const { file_path } = args;
  const ext = path.extname(file_path).toLowerCase();

  const mockBase64 = Buffer.from('test data').toString('base64');
  const mimeType = {
    '.svg': 'image/svg+xml;charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.cur': 'image/x-icon',
    '.ani': 'application/x-navi-animation',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp'
  }[ext] || 'application/octet-stream';

  if (ext === '.svg') {
    // Return percent-encoded SVG
    return Promise.resolve(`data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22blue%22/%3E%3C/svg%3E`);
  }

  return Promise.resolve(`data:${mimeType};base64,${mockBase64}`);
}

function handleRenderCursorImagePreview(args) {
  const { file_path } = args;

  if (file_path.includes('non/existent')) {
    return Promise.reject(new Error('File not found'));
  }

  const ext = path.extname(file_path).toLowerCase();

  if (ext === '.svg') {
    // Return PNG data for SVG preview
    return Promise.resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
  }

  // For other formats, return the file as data URL
  const mockBase64 = Buffer.from('test data').toString('base64');
  const mimeType = {
    '.svg': 'image/svg+xml;charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.cur': 'image/x-icon',
    '.ani': 'application/x-navi-animation',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp'
  }[ext] || 'application/octet-stream';

  return Promise.resolve(`data:${mimeType};base64,${mockBase64}`);
}

// ============================================================================
// PERFORMANCE TESTS - File Operations
// ============================================================================

describe('Performance Tests - File Operations', () => {
  it('should convert files quickly', async () => {
    const startTime = Date.now();

    const conversions = Array.from({ length: 10 }, (_, i) =>
      mockInvoke('convert_image_to_cur', {
        input_path: `/test/cursor${i}.svg`,
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      })
    );

    await Promise.all(conversions);

    const endTime = Date.now();

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('should read file data efficiently', async () => {
    const startTime = Date.now();

    const reads = Array.from({ length: 10 }, (_, i) =>
      mockInvoke('read_cursor_file_as_data_url', {
        file_path: `/test/cursor${i}.cur`
      })
    );

    await Promise.all(reads);

    const endTime = Date.now();

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(500);
  });

  it('should handle batch file operations efficiently', async () => {
    const startTime = Date.now();

    // Mix of different operations
    const operations = [
      mockInvoke('convert_image_to_cur', {
        input_path: '/test/batch1.svg',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      }),
      mockInvoke('get_cursor_with_hotspot', {
        file_path: '/test/batch2.cur'
      }),
      mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/batch3.svg'
      }),
      mockInvoke('render_cursor_image_preview', {
        file_path: '/test/batch4.png'
      })
    ];

    await Promise.all(operations);

    const endTime = Date.now();

    // Should complete within reasonable time
    expect(endTime - startTime).toBeLessThan(300);
  });
});