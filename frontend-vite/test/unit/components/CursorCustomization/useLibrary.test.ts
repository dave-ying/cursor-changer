import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLibrary } from '@/components/CursorCustomization/Library/useLibrary';
import { useApp } from '@/context/AppContext';
import { useAppStore } from '@/store/useAppStore';
import { useMessage } from '@/hooks/useMessage';
import { Commands } from '@/tauri/commands';

vi.mock('@/context/AppContext', () => ({
  useApp: vi.fn(),
}));

vi.mock('@/hooks/useMessage', () => ({
  useMessage: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useLibrary', () => {
  let invoke: ReturnType<typeof vi.fn>;
  let loadLibraryCursors: ReturnType<typeof vi.fn>;
  let loadAvailableCursors: ReturnType<typeof vi.fn>;
  let showMessage: ReturnType<typeof vi.fn>;
  let initialStoreState: ReturnType<typeof useAppStore.getState>;

  beforeEach(() => {
    initialStoreState = useAppStore.getState();
    invoke = vi.fn().mockResolvedValue(undefined);
    loadLibraryCursors = vi.fn().mockResolvedValue(undefined);
    loadAvailableCursors = vi.fn().mockResolvedValue(undefined);
    showMessage = vi.fn();

    vi.mocked(useMessage).mockReturnValue({
      showMessage,
      addToast: vi.fn(),
      message: { text: '', type: '' }
    } as any);
  });

  afterEach(() => {
    useAppStore.setState(initialStoreState, true);
    vi.restoreAllMocks();
  });

  it('applyLibraryToSelected shows error when no target cursor name is provided', async () => {
    vi.mocked(useApp).mockReturnValue({ invoke } as any);

    useAppStore.setState((state) =>
      ({
        libraryCursors: [],
        cursorState: { ...state.cursorState, cursorSize: 32 },
        operations: {
          ...state.operations,
          loadLibraryCursors,
          loadAvailableCursors,
        } as any
      }) as any
    );

    const { result } = renderHook(() => useLibrary());

    await act(async () => {
      await result.current.applyLibraryToSelected({
        name: 'Lib Cursor',
        file_path: 'C:\\lib.cur',
      } as any);
    });

    expect(showMessage).toHaveBeenCalledWith('No target cursor selected', 'error');
    expect(invoke).not.toHaveBeenCalled();
  });

  it('handleDragEnd reorders library locally and persists new order', async () => {
    vi.mocked(useApp).mockReturnValue({ invoke } as any);

    useAppStore.setState((state) =>
      ({
        libraryCursors: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] as any,
        cursorState: { ...state.cursorState, cursorSize: 32 },
        operations: {
          ...state.operations,
          loadLibraryCursors,
          loadAvailableCursors,
        } as any
      }) as any
    );

    const { result } = renderHook(() => useLibrary());

    await act(async () => {
      result.current.setDraggingLibrary({ id: 'a' });
    });

    await act(async () => {
      await result.current.handleDragEnd({
        active: { id: 'a', data: { current: { type: 'library' } } },
        over: { id: 'c', data: { current: { type: 'library' } } },
      });
    });

    await waitFor(() => {
      expect(result.current.localLibrary.map((x: any) => x.id)).toEqual(['b', 'c', 'a']);
    });

    expect(invoke).toHaveBeenCalledWith(Commands.reorderLibraryCursors, {
      order: ['b', 'c', 'a'],
    });

    expect(result.current.draggingLib).toBe(null);
  });

  it('handleDragEnd applies library cursor when dropped onto a slot and refreshes data', async () => {
    vi.mocked(useApp).mockReturnValue({ invoke } as any);

    useAppStore.setState((state) =>
      ({
        libraryCursors: [{ id: 'lib_1', name: 'Lib Cursor', file_path: 'C:\\lib.cur' }] as any,
        cursorState: { ...state.cursorState, cursorSize: 48 },
        operations: {
          ...state.operations,
          loadLibraryCursors,
          loadAvailableCursors,
        } as any
      }) as any
    );

    const { result } = renderHook(() => useLibrary());

    await act(async () => {
      await result.current.handleDragEnd({
        active: {
          id: 'lib_1',
          data: { current: { type: 'library', lib: { name: 'Lib Cursor', file_path: 'C:\\lib.cur' } } },
        },
        over: {
          id: 'slot_Normal',
          data: { current: { type: 'slot', cursor: { name: 'Normal', display_name: 'Normal Pointer' } } },
        },
      });
    });

    expect(invoke).toHaveBeenCalledWith(Commands.setSingleCursorWithSize, {
      cursor_name: 'Normal',
      image_path: 'C:\\lib.cur',
      size: 48,
    });

    expect(loadLibraryCursors).toHaveBeenCalledTimes(1);
    expect(loadAvailableCursors).toHaveBeenCalledTimes(1);

    expect(showMessage).toHaveBeenCalledWith('Applied Lib Cursor to Normal Pointer', 'success');
  });
});
