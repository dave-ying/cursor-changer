import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { removeImageBackground, isBackgroundRemovalSupported } from '@/lib/backgroundRemoval';

vi.mock('@imgly/background-removal', () => ({
  removeBackground: vi.fn(),
}));

describe('lib/backgroundRemoval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isBackgroundRemovalSupported returns true for supported image mime types', () => {
    expect(isBackgroundRemovalSupported(new File(['x'], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isBackgroundRemovalSupported(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe(true);
    expect(isBackgroundRemovalSupported(new File(['x'], 'a.webp', { type: 'image/webp' }))).toBe(true);
  });

  it('isBackgroundRemovalSupported returns false for unsupported mime types', () => {
    expect(isBackgroundRemovalSupported(new File(['x'], 'a.gif', { type: 'image/gif' }))).toBe(false);
    expect(isBackgroundRemovalSupported(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe(false);
  });

  it('removeImageBackground converts File to Blob and calls removeBackground', async () => {
    const { removeBackground } = await import('@imgly/background-removal');
    const resultBlob = new Blob([new Uint8Array([9, 8, 7])], { type: 'image/png' });
    (removeBackground as any).mockResolvedValue(resultBlob);

    const fileBytes = new Uint8Array([1, 2, 3, 4]);
    const file = new File([fileBytes], 'test.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => fileBytes.buffer });

    const out = await removeImageBackground(file);

    expect(removeBackground).toHaveBeenCalledTimes(1);
    const arg0 = (removeBackground as any).mock.calls[0][0];
    expect(arg0).toBeInstanceOf(Blob);
    expect((arg0 as Blob).type).toBe('image/png');
    expect(out).toBe(resultBlob);
  });

  it('removeImageBackground throws a descriptive error when background removal fails', async () => {
    const { removeBackground } = await import('@imgly/background-removal');
    (removeBackground as any).mockRejectedValue(new Error('boom'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const file = new File([new Uint8Array([1])], 'test.png', { type: 'image/png' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new Uint8Array([1]).buffer });

    await expect(removeImageBackground(file)).rejects.toThrow('Failed to remove background: boom');

    consoleErrorSpy.mockRestore();
  });
});
