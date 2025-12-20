import { describe, it, expect, vi } from 'vitest';
import { Events, listenEvent } from '@/tauri/events';

describe('tauri/events listenEvent', () => {
  it('wraps listen and forwards payload only', async () => {
    const unlisten = vi.fn();
    const listen = vi.fn(async (_event: string, _handler: (e: { payload: any }) => void) => unlisten);

    const handler = vi.fn();
    const returnedUnlisten = await listenEvent(listen, Events.cursorState, handler);

    expect(returnedUnlisten).toBe(unlisten);
    expect(listen).toHaveBeenCalledWith(Events.cursorState, expect.any(Function));

    const wrapped = listen.mock.calls[0]![1] as (e: { payload: any }) => void;
    wrapped({ payload: { hidden: true } });

    expect(handler).toHaveBeenCalledWith({ hidden: true });
  });
});
