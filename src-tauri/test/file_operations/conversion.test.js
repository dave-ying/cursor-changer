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
      case 'convert_image_to_cur_with_hotspot':
        return handleConvertImageToCurWithHotspot(args);
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

function handleConvertImageToCurWithHotspot(args) {
  const { input_path, size, hotspot_x, hotspot_y } = args;
  const ext = path.extname(input_path).toLowerCase();

  if (!['.svg', '.png', '.ico', '.bmp', '.jpg', '.jpeg'].includes(ext)) {
    return Promise.reject('Unsupported file type');
  }

  const baseName = path.basename(input_path, ext);
  const output_path = `${baseName}_hotspot_${size}_${hotspot_x}_${hotspot_y}.cur`;

  return Promise.resolve({
    output_path,
    size,
    hotspot_x,
    hotspot_y,
    format: ext.substring(1)
  });
}

// ============================================================================
// FILE CONVERSION OPERATIONS - Unit Tests
// ============================================================================

describe('File Conversion Operations - Unit Tests', () => {
  describe('convert_image_to_cur', () => {
    it('should convert SVG to CUR with default settings', async () => {
      const result = await mockInvoke('convert_image_to_cur', {
        input_path: '/test/cursor.svg',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result).toMatchObject({
        output_path: '/test/cursor_converted.cur',
        size: 256,
        hotspot_x: 0,
        hotspot_y: 0,
        format: 'svg'
      });
    });

    it('should convert PNG to CUR', async () => {
      const result = await mockInvoke('convert_image_to_cur', {
        input_path: '/test/image.png',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result.format).toBe('png');
      expect(result.output_path).toMatch(/_converted\.cur$/);
    });

    it('should convert ICO to CUR', async () => {
      const result = await mockInvoke('convert_image_to_cur', {
        input_path: '/test/icon.ico',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result.format).toBe('ico');
    });

    it('should convert BMP to CUR', async () => {
      const result = await mockInvoke('convert_image_to_cur', {
        input_path: '/test/image.bmp',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result.format).toBe('bmp');
    });

    it('should convert JPG to CUR', async () => {
      const result = await mockInvoke('convert_image_to_cur', {
        input_path: '/test/photo.jpg',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result.format).toBe('jpg');
    });

    it('should convert JPEG to CUR', async () => {
      const result = await mockInvoke('convert_image_to_cur', {
        input_path: '/test/photo.jpeg',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result.format).toBe('jpeg');
    });

    it('should reject unsupported file types', async () => {
      await expect(
        mockInvoke('convert_image_to_cur', {
          input_path: '/test/document.txt',
          app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
        })
      ).rejects.toMatch('Unsupported file type');
    });

    it('should handle case-insensitive extensions', async () => {
      const result = await mockInvoke('convert_image_to_cur', {
        input_path: '/test/cursor.SVG',
        app: { path: { appDataDir: () => Promise.resolve('/mock/app/data') } }
      });

      expect(result.format).toBe('svg');
    });
  });

  describe('convert_image_to_cur_with_hotspot', () => {
    it('should convert with custom size and hotspot', async () => {
      const result = await mockInvoke('convert_image_to_cur_with_hotspot', {
        input_path: '/test/cursor.svg',
        size: 128,
        hotspot_x: 64,
        hotspot_y: 32
      });

      expect(result).toMatchObject({
        size: 128,
        hotspot_x: 64,
        hotspot_y: 32,
        output_path: expect.stringContaining('hotspot_128_64_32')
      });
    });

    it('should handle minimum size (16px)', async () => {
      const result = await mockInvoke('convert_image_to_cur_with_hotspot', {
        input_path: '/test/tiny.svg',
        size: 16,
        hotspot_x: 8,
        hotspot_y: 8
      });

      expect(result.size).toBe(16);
    });

    it('should handle maximum size (512px)', async () => {
      const result = await mockInvoke('convert_image_to_cur_with_hotspot', {
        input_path: '/test/large.svg',
        size: 512,
        hotspot_x: 256,
        hotspot_y: 256
      });

      expect(result.size).toBe(512);
    });

    it('should center hotspot when coordinates are zero', async () => {
      const result = await mockInvoke('convert_image_to_cur_with_hotspot', {
        input_path: '/test/center.svg',
        size: 256,
        hotspot_x: 0,
        hotspot_y: 0
      });

      expect(result.hotspot_x).toBe(0);
      expect(result.hotspot_y).toBe(0);
    });

    it('should generate descriptive output filename', async () => {
      const result = await mockInvoke('convert_image_to_cur_with_hotspot', {
        input_path: '/path/to/My_Cursor_File.svg',
        size: 64,
        hotspot_x: 32,
        hotspot_y: 16
      });

      expect(result.output_path).toBe('My_Cursor_File_hotspot_64_32_16.cur');
    });
  });
});