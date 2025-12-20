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
      case 'get_cursor_with_hotspot':
        return handleGetCursorWithHotspot(args);
      case 'add_uploaded_cursor_to_library':
        return handleAddUploadedCursorToLibrary(args);
      case 'add_uploaded_image_with_hotspot_to_library':
        return handleAddUploadedImageWithHotspotToLibrary(args);
      case 'update_library_cursor_hotspot':
        return handleUpdateLibraryCursorHotspot(args);
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
// INTEGRATION TESTS - Complete File Workflows
// ============================================================================

describe('Integration Tests - File Workflows', () => {
  it('should complete file upload and conversion workflow', async () => {
    // 1. Browse for file
    const filePath = await mockInvoke('browse_cursor_file');
    expect(filePath).toBe('/mock/selected/cursor.svg');

    // 2. Convert file with hotspot
    const conversion = await mockInvoke('convert_image_to_cur_with_hotspot', {
      input_path: filePath,
      size: 128,
      hotspot_x: 64,
      hotspot_y: 64
    });
    expect(conversion.output_path).toContain('hotspot_128_64_64');

    // 3. Get cursor info
    const cursorInfo = await mockInvoke('get_cursor_with_hotspot', {
      file_path: conversion.output_path
    });
    expect(cursorInfo).toBeDefined();
  });

  it('should complete upload to library workflow', async () => {
    // 1. Upload file
    const uploaded = await mockInvoke('add_uploaded_cursor_to_library', {
      filename: 'workflow.svg',
      data: new TextEncoder().encode('<svg>test</svg>')
    });
    expect(uploaded.id).toBeDefined();

    // 2. Update hotspot
    const updated = await mockInvoke('update_library_cursor_hotspot', {
      id: uploaded.id,
      hotspot_x: 100,
      hotspot_y: 100
    });
    expect(updated.hotspot_x).toBe(100);

    // 3. Get preview
    const preview = await mockInvoke('render_cursor_image_preview', {
      file_path: updated.file_path
    });
    expect(preview).toBeDefined();
  });

  it('should handle image upload with hotspot picker workflow', async () => {
    // 1. Upload image with hotspot
    const result = await mockInvoke('add_uploaded_image_with_hotspot_to_library', {
      filename: 'hotspot-workflow.png',
      data: Array.from(mockFileData.png),
      size: 256,
      hotspot_x: 128,
      hotspot_y: 64
    });

    expect(result).toMatchObject({
      name: 'hotspot-workflow',
      hotspot_x: 128,
      hotspot_y: 64
    });

    // 2. Get file data
    const fileData = await mockInvoke('render_cursor_image_preview', {
      file_path: result.file_path
    });
    expect(fileData).toBeDefined();
  });
});