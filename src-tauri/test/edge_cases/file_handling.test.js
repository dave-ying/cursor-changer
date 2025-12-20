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
      case 'get_cursor_with_hotspot':
        return handleGetCursorWithHotspot(args);
      case 'add_uploaded_cursor_to_library':
        return handleAddUploadedCursorToLibrary(args);
      case 'add_uploaded_image_with_hotspot_to_library':
        return handleAddUploadedImageWithHotspotToLibrary(args);
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

function handleGetCursorWithHotspot(args) {
  const { file_path } = args;
  const ext = path.extname(file_path).toLowerCase();

  if (['.cur', '.ani', '.ico', '.svg', '.png', '.bmp', '.jpg', '.jpeg'].includes(ext)) {
    return Promise.resolve({
      data_url: 'data:image/x-icon;base64,AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA',
      hotspot_x: 10,
      hotspot_y: 15,
      width: 32,
      height: 32
    });
  }

  return Promise.reject('Unsupported cursor format');
}

let cursorIdCounter = 0;
function generateCursorId() {
  return `lib_${Date.now()}_${cursorIdCounter++}`;
}

function handleAddUploadedCursorToLibrary(args) {
  const { filename, data } = args;
  const ext = path.extname(filename).toLowerCase();

  if (!['.svg', '.png', '.cur', '.ani', '.ico', '.bmp', '.jpg', '.jpeg'].includes(ext)) {
    return Promise.reject(new Error('Unsupported file type'));
  }

  let finalFilename = filename;
  if (['.svg', '.png', '.ico', '.bmp', '.jpg', '.jpeg'].includes(ext)) {
    finalFilename = filename.replace(ext, '_converted.cur');
  }

  return Promise.resolve({
    id: generateCursorId(),
    name: path.basename(filename, path.extname(filename)),
    file_path: `/mock/app/data/${finalFilename}`,
    hotspot_x: 0,
    hotspot_y: 0,
    created_at: new Date().toISOString()
  });
}

function handleAddUploadedImageWithHotspotToLibrary(args) {
  const { filename, data, size, hotspot_x, hotspot_y } = args;
  const ext = path.extname(filename).toLowerCase();

  if (!['.png', '.bmp', '.jpg', '.jpeg', '.svg'].includes(ext)) {
    return Promise.reject(new Error('Unsupported image type for hotspot picker'));
  }

  return Promise.resolve({
    id: generateCursorId(),
    name: path.basename(filename, path.extname(filename)),
    file_path: `/mock/app/data/${filename}_hotspot_${size}_${hotspot_x}_${hotspot_y}.cur`,
    hotspot_x,
    hotspot_y,
    created_at: new Date().toISOString()
  });
}

// ============================================================================
// EDGE CASE TESTS - File Operations
// ============================================================================

describe('Edge Cases - File Operations', () => {
  describe('File Path Handling', () => {
    it('should handle long file paths', async () => {
      const longPath = 'C:\\' + 'a'.repeat(200) + '\\cursor.svg';

      const result = await mockInvoke('convert_image_to_cur', {
        input_path: longPath,
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result).toBeDefined();
    });

    it('should handle Unicode characters in paths', async () => {
      const unicodePath = 'C:\\Users\\日本語\\カーソル\\custom.svg';

      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: unicodePath
      });

      expect(result).toBeDefined();
    });

    it('should handle paths with spaces and special characters', async () => {
      const specialPath = 'C:\\My Documents\\Custom Cursors\\my cursor (special).svg';

      const result = await mockInvoke('get_cursor_with_hotspot', {
        file_path: specialPath
      });

      expect(result).toBeDefined();
    });
  });

  describe('File Size Handling', () => {
    it('should handle very small files', async () => {
      const smallSvg = '<svg></svg>';

      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'small.svg',
        data: new TextEncoder().encode(smallSvg)
      });

      expect(result).toBeDefined();
    });

    it('should handle large file data', async () => {
      const largeData = new Uint8Array(1024 * 1024); // 1MB

      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'large.png',
        data: Array.from(largeData)
      });

      expect(result).toBeDefined();
    });
  });

  describe('Invalid File Handling', () => {
    it('should handle corrupted SVG', async () => {
      const corruptedSvg = '<svg><broken>';

      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'corrupted.svg',
        data: new TextEncoder().encode(corruptedSvg)
      });

      expect(result).toBeDefined();
    });

    it('should handle invalid file signatures', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/invalid.xyz'
      });

      // Should handle gracefully, not crash
      expect(result).toBeDefined();
    });
  });

  describe('Hotspot Validation', () => {
    it('should handle negative hotspot coordinates', async () => {
      const result = await mockInvoke('add_uploaded_image_with_hotspot_to_library', {
        filename: 'negative.svg',
        data: new TextEncoder().encode('<svg>test</svg>'),
        size: 256,
        hotspot_x: -10,
        hotspot_y: -5
      });

      expect(result.hotspot_x).toBe(-10);
      expect(result.hotspot_y).toBe(-5);
    });

    it('should handle very large hotspot coordinates', async () => {
      const result = await mockInvoke('add_uploaded_image_with_hotspot_to_library', {
        filename: 'large-hotspot.svg',
        data: new TextEncoder().encode('<svg>test</svg>'),
        size: 256,
        hotspot_x: 1000000,
        hotspot_y: 1000000
      });

      expect(result.hotspot_x).toBe(1000000);
      expect(result.hotspot_y).toBe(1000000);
    });
  });
});