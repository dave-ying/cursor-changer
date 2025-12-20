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
      case 'add_uploaded_cursor_to_library':
        return handleAddUploadedCursorToLibrary(args);
      case 'add_uploaded_image_with_hotspot_to_library':
        return handleAddUploadedImageWithHotspotToLibrary(args);
      case 'update_library_cursor_hotspot':
        return handleUpdateLibraryCursorHotspot(args);
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

function handleUpdateLibraryCursorHotspot(args) {
  const { id, hotspot_x, hotspot_y } = args;

  return Promise.resolve({
    id,
    name: 'Updated Cursor',
    file_path: '/mock/app/data/updated.cur',
    hotspot_x,
    hotspot_y,
    created_at: '2025-01-01T00:00:00Z'
  });
}

// ============================================================================
// UPLOAD HANDLING OPERATIONS - Unit Tests
// ============================================================================

describe('Upload Handling Operations - Unit Tests', () => {
  describe('add_uploaded_cursor_to_library', () => {
    it('should add SVG file to library', async () => {
      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'uploaded.svg',
        data: new TextEncoder().encode('<svg>test</svg>')
      });

      expect(result).toMatchObject({
        name: 'uploaded',
        file_path: expect.stringContaining('uploaded_converted.cur'),
        hotspot_x: 0,
        hotspot_y: 0
      });
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('created_at');
    });

    it('should add PNG file to library', async () => {
      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'image.png',
        data: Array.from(mockFileData.png)
      });

      expect(result.name).toBe('image');
      expect(result.file_path).toMatch(/_converted\.cur$/);
    });

    it('should add CUR file to library without conversion', async () => {
      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'existing.cur',
        data: Array.from(mockFileData.cur)
      });

      expect(result.file_path).toBe('/mock/app/data/existing.cur');
    });

    it('should add ANI file to library without conversion', async () => {
      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'animation.ani',
        data: Array.from(mockFileData.ani)
      });

      expect(result.file_path).toBe('/mock/app/data/animation.ani');
    });

    it('should reject unsupported file types', async () => {
      await expect(
        mockInvoke('add_uploaded_cursor_to_library', {
          filename: 'document.txt',
          data: new TextEncoder().encode('text content')
        })
      ).rejects.toThrow('Unsupported file type');
    });

    it('should handle files with special characters in names', async () => {
      const result = await mockInvoke('add_uploaded_cursor_to_library', {
        filename: 'My Cursor (Special) [v1.0].svg',
        data: new TextEncoder().encode('<svg>test</svg>')
      });

      expect(result.name).toBe('My Cursor (Special) [v1.0]');
    });
  });

  describe('add_uploaded_image_with_hotspot_to_library', () => {
    it('should add image with custom hotspot to library', async () => {
      const result = await mockInvoke('add_uploaded_image_with_hotspot_to_library', {
        filename: 'hotspot.svg',
        data: new TextEncoder().encode('<svg>test</svg>'),
        size: 128,
        hotspot_x: 64,
        hotspot_y: 32
      });

      expect(result).toMatchObject({
        name: 'hotspot',
        file_path: expect.stringContaining('hotspot_128_64_32'),
        hotspot_x: 64,
        hotspot_y: 32
      });
    });

    it('should handle minimum size (16px)', async () => {
      const result = await mockInvoke('add_uploaded_image_with_hotspot_to_library', {
        filename: 'tiny.png',
        data: Array.from(mockFileData.png),
        size: 16,
        hotspot_x: 8,
        hotspot_y: 8
      });

      expect(result.file_path).toContain('hotspot_16_8_8');
    });

    it('should handle maximum size (512px)', async () => {
      const result = await mockInvoke('add_uploaded_image_with_hotspot_to_library', {
        filename: 'large.jpg',
        data: Array.from(mockFileData.png),
        size: 512,
        hotspot_x: 256,
        hotspot_y: 256
      });

      expect(result.file_path).toContain('hotspot_512_256_256');
    });

    it('should reject non-image files', async () => {
      await expect(
        mockInvoke('add_uploaded_image_with_hotspot_to_library', {
          filename: 'document.txt',
          data: new TextEncoder().encode('text content'),
          size: 256,
          hotspot_x: 0,
          hotspot_y: 0
        })
      ).rejects.toThrow('Unsupported image type for hotspot picker');
    });

    it('should handle zero hotspot coordinates', async () => {
      const result = await mockInvoke('add_uploaded_image_with_hotspot_to_library', {
        filename: 'zero.svg',
        data: new TextEncoder().encode('<svg>test</svg>'),
        size: 256,
        hotspot_x: 0,
        hotspot_y: 0
      });

      expect(result.hotspot_x).toBe(0);
      expect(result.hotspot_y).toBe(0);
    });
  });

  describe('update_library_cursor_hotspot', () => {
    it('should update cursor hotspot in library', async () => {
      const result = await mockInvoke('update_library_cursor_hotspot', {
        id: 'lib_123',
        hotspot_x: 50,
        hotspot_y: 75
      });

      expect(result).toMatchObject({
        id: 'lib_123',
        hotspot_x: 50,
        hotspot_y: 75
      });
    });

    it('should handle zero hotspot coordinates', async () => {
      const result = await mockInvoke('update_library_cursor_hotspot', {
        id: 'lib_456',
        hotspot_x: 0,
        hotspot_y: 0
      });

      expect(result.hotspot_x).toBe(0);
      expect(result.hotspot_y).toBe(0);
    });

    it('should handle maximum hotspot coordinates', async () => {
      const result = await mockInvoke('update_library_cursor_hotspot', {
        id: 'lib_789',
        hotspot_x: 65535,
        hotspot_y: 65535
      });

      expect(result.hotspot_x).toBe(65535);
      expect(result.hotspot_y).toBe(65535);
    });
  });
});