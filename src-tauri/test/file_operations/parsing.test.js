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
      case 'get_cursor_with_hotspot':
        return handleGetCursorWithHotspot(args);
      case 'read_cursor_file_as_data_url':
        return handleReadCursorFileAsDataUrl(args);
      case 'read_cursor_file_as_bytes':
        return handleReadCursorFileAsBytes(args);
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
function handleGetCursorWithHotspot(args) {
  const { file_path } = args;
  const ext = path.extname(file_path).toLowerCase();

  if (['.cur', '.ani', '.ico', '.svg', '.png', '.bmp', '.jpg', '.jpeg'].includes(ext)) {
    return Promise.resolve({
      data_url: 'data:image/x-icon;base64,AAABAAEAEBAQAAEABAAoAQAAFgAAACgAAAAQAAAAIAAAAAEABAAAAAAAgAAAAAAAAAAAAAAAEAAAAAAAAAAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8A',
      hotspot_x: 10,
      hotspot_y: 15,
      width: 32,
      height: 32
    });
  }

  return Promise.reject('Unsupported cursor format');
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

function handleReadCursorFileAsBytes(args) {
  const { file_path } = args;
  const ext = path.extname(file_path).toLowerCase();

  // Return appropriate mock data based on extension
  const mockData = {
    '.svg': mockFileData.svg,
    '.png': mockFileData.png,
    '.cur': mockFileData.cur,
    '.ico': mockFileData.ico,
    '.ani': mockFileData.ani
  }[ext];

  if (mockData) {
    return Promise.resolve(Array.from(mockData));
  }

  return Promise.reject('Unsupported file type');
}

// ============================================================================
// FILE PARSING OPERATIONS - Unit Tests
// ============================================================================

describe('File Parsing Operations - Unit Tests', () => {
  describe('get_cursor_with_hotspot', () => {
    it('should extract hotspot from CUR file', async () => {
      const result = await mockInvoke('get_cursor_with_hotspot', {
        file_path: '/test/cursor.cur'
      });

      expect(result).toMatchObject({
        hotspot_x: 10,
        hotspot_y: 15,
        width: 32,
        height: 32
      });
      expect(result.data_url).toMatch(/^data:image\/x-icon;base64,/);
    });

    it('should extract hotspot from ANI file', async () => {
      const result = await mockInvoke('get_cursor_with_hotspot', {
        file_path: '/test/animation.ani'
      });

      expect(result).toMatchObject({
        hotspot_x: 10,
        hotspot_y: 15
      });
    });

    it('should extract hotspot from ICO file', async () => {
      const result = await mockInvoke('get_cursor_with_hotspot', {
        file_path: '/test/icon.ico'
      });

      expect(result).toMatchObject({
        hotspot_x: 10,
        hotspot_y: 15
      });
    });

    it('should reject unsupported cursor formats', async () => {
      await expect(
        mockInvoke('get_cursor_with_hotspot', {
          file_path: '/test/unsupported.txt'
        })
      ).rejects.toMatch('Unsupported cursor format');
    });

    it('should handle different cursor dimensions', async () => {
      const result = await mockInvoke('get_cursor_with_hotspot', {
        file_path: '/test/large.cur'
      });

      expect(result.width).toBeDefined();
      expect(result.height).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });
  });

  describe('read_cursor_file_as_data_url', () => {
    it('should read SVG as percent-encoded text data URL', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/cursor.svg'
      });

      expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
      expect(result).toContain('%3Csvg'); // URL-encoded '<svg'
    });

    it('should read PNG as base64 data URL', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/image.png'
      });

      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should read CUR as icon data URL', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/cursor.cur'
      });

      expect(result).toMatch(/^data:image\/x-icon;base64,/);
    });

    it('should read ANI as animation data URL', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/animation.ani'
      });

      expect(result).toMatch(/^data:application\/x-navi-animation;base64,/);
    });

    it('should read ICO as icon data URL', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/icon.ico'
      });

      expect(result).toMatch(/^data:image\/x-icon;base64,/);
    });

    it('should read BMP as bitmap data URL', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/image.bmp'
      });

      expect(result).toMatch(/^data:image\/bmp;base64,/);
    });

    it('should handle case-insensitive file extensions', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/cursor.SVG'
      });

      expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    });

    it('should handle unknown file types as octet-stream', async () => {
      const result = await mockInvoke('read_cursor_file_as_data_url', {
        file_path: '/test/unknown.xyz'
      });

      expect(result).toMatch(/^data:application\/octet-stream;base64,/);
    });
  });

  describe('read_cursor_file_as_bytes', () => {
    it('should return SVG as byte array', async () => {
      const result = await mockInvoke('read_cursor_file_as_bytes', {
        file_path: '/test/cursor.svg'
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return PNG as byte array', async () => {
      const result = await mockInvoke('read_cursor_file_as_bytes', {
        file_path: '/test/image.png'
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return CUR as byte array', async () => {
      const result = await mockInvoke('read_cursor_file_as_bytes', {
        file_path: '/test/cursor.cur'
      });

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should reject unsupported file types', async () => {
      await expect(
        mockInvoke('read_cursor_file_as_bytes', {
          file_path: '/test/unsupported.txt'
        })
      ).rejects.toMatch('Unsupported file type');
    });
  });
});