import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAppStore } from '@/store/useAppStore';

const mockInvoke = vi.fn();
const mockLoadLibraryCursors = vi.fn();
const mockShowMessage = vi.fn();

vi.mock('@/context/AppContext', () => ({
  useApp: () => ({
    invoke: mockInvoke,
  }),
}));

vi.mock('@/context/MessageContext', () => ({
  useMessage: () => ({
    showMessage: mockShowMessage,
  }),
}));

describe('CursorCustomization/FileUpload/useFileUpload', () => {
  let initialStoreState: ReturnType<typeof useAppStore.getState>;

  beforeEach(() => {
    vi.clearAllMocks();
    initialStoreState = useAppStore.getState();
    mockLoadLibraryCursors.mockResolvedValue(undefined);

    useAppStore.setState(
      (state) => ({
        ...state,
        operations: {
          ...state.operations,
          loadLibraryCursors: mockLoadLibraryCursors,
        }
      }),
      true
    );
  });

  afterEach(() => {
    useAppStore.setState(initialStoreState, true);
    vi.restoreAllMocks();
  });

  it('openBrowseModal and closeBrowseModal toggle showBrowseModal', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    const { result } = renderHook(() => useFileUpload());

    expect(result.current.showBrowseModal).toBe(false);

    act(() => result.current.openBrowseModal());
    expect(result.current.showBrowseModal).toBe(true);

    act(() => result.current.closeBrowseModal());
    expect(result.current.showBrowseModal).toBe(false);
  });

  it('handleFileSelect uploads .cur/.ani via addUploadedCursorToLibrary and refreshes library', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    mockInvoke.mockResolvedValue({ id: 'x', name: 'My Cursor' });

    const fileBytes = new Uint8Array([1, 2, 3]);
    const file = new File([fileBytes], 'test.cur', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => fileBytes.buffer });

    const event = { target: { files: [file] } } as any;

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.handleFileSelect(event);
    });

    expect(mockInvoke).toHaveBeenCalledWith('add_uploaded_cursor_to_library', {
      filename: 'test.cur',
      data: [1, 2, 3],
    });

    expect(mockShowMessage).toHaveBeenCalledWith('Added My Cursor to library', 'success');
    expect(mockLoadLibraryCursors).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
  });

  it('handleFileSelect closes modal after successful cursor upload even when refresh fails', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    mockInvoke.mockResolvedValue({ id: 'drag', name: 'Duplicate Cursor' });
    mockLoadLibraryCursors.mockRejectedValueOnce(new Error('refresh fail'));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const fileBytes = new Uint8Array([7, 8]);
    const file = new File([fileBytes], 'drag.cur', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => fileBytes.buffer });

    const fileList: any = {
      length: 1,
      item: (index: number) => (index === 0 ? file : null),
      0: file
    };

    const event = { target: { files: fileList } } as any;

    const { result } = renderHook(() => useFileUpload());

    act(() => result.current.openBrowseModal());
    expect(result.current.showBrowseModal).toBe(true);

    await act(async () => {
      await result.current.handleFileSelect(event);
    });

    expect(mockInvoke).toHaveBeenCalledWith('add_uploaded_cursor_to_library', {
      filename: 'drag.cur',
      data: [7, 8],
    });
    expect(mockShowMessage).toHaveBeenCalledWith('Added Duplicate Cursor to library', 'success');
    expect(mockLoadLibraryCursors).toHaveBeenCalled();
    expect(result.current.showBrowseModal).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      '[WARN]',
      'Failed to refresh cursor library after upload:',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('handleFileSelect sets clickPointFile and returns type=image for supported image files', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    const file = new File([new Uint8Array([9])], 'test.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array([9]).buffer });

    const event = { target: { files: [file] } } as any;

    const { result } = renderHook(() => useFileUpload());

    let ret: any;
    await act(async () => {
      ret = await result.current.handleFileSelect(event);
    });

    expect(ret).toEqual({ type: 'image', file });
    expect(result.current.clickPointFile).toBe(file);
  });

  it('handleFileSelect shows error message for unsupported file types', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    const file = new File([new Uint8Array([9])], 'bad.xyz', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array([9]).buffer });

    const event = { target: { files: [file] } } as any;

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.handleFileSelect(event);
    });

    expect(mockShowMessage).toHaveBeenCalledWith('Unsupported file type: .xyz', 'error');
  });

  it('handleFileSelect handles backend failure by logging and showing error toast', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke.mockRejectedValueOnce(new Error('fail'));

    const fileBytes = new Uint8Array([1]);
    const file = new File([fileBytes], 'test.cur', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => fileBytes.buffer });

    const event = { target: { files: [file] } } as any;

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.handleFileSelect(event);
    });

    expect(mockShowMessage).toHaveBeenCalledWith(
      expect.stringContaining('Failed to add cursor to library:'),
      'error'
    );

    consoleErrorSpy.mockRestore();

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });
  });

  it('clearClickPointFile resets both clickPointFile and clickPointFilePath', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    const { result } = renderHook(() => useFileUpload());

    const file = new File([new Uint8Array([3])], 'picker.png', { type: 'image/png' });

    act(() => {
      result.current.setClickPointFileForPicker(file);
      result.current.setClickPointFilePathForPicker('path/to/file.cur');
    });

    expect(result.current.clickPointFile).toBe(file);
    expect(result.current.clickPointFilePath).toBe('path/to/file.cur');

    act(() => {
      result.current.clearClickPointFile();
    });

    expect(result.current.clickPointFile).toBeNull();
    expect(result.current.clickPointFilePath).toBeNull();
  });

  it('handleFileSelect exits early when no files are provided', async () => {
    const { useFileUpload } = await import('@/components/CursorCustomization/FileUpload/useFileUpload');

    const { result } = renderHook(() => useFileUpload());

    await act(async () => {
      await result.current.handleFileSelect({ target: { files: [] } } as any);
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.isUploading).toBe(false);
  });
});
