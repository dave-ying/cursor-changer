import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tauri-apps/api/core', () => ({
  convertFileSrc: (p: string) => `tauri:${p}`
}));

describe('CursorCustomization/AniPreview', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders null when frames are empty', async () => {
    const { AniPreview } = await import('@/components/CursorCustomization/AniPreview');
    const { container } = render(<AniPreview data={{ frames: [], delays: [] } as any} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an img for the current frame', async () => {
    const { AniPreview } = await import('@/components/CursorCustomization/AniPreview');

    const rafSpy = vi.fn(() => 1);
    const cancelSpy = vi.fn();
    (globalThis as any).requestAnimationFrame = rafSpy;
    (globalThis as any).cancelAnimationFrame = cancelSpy;

    render(<AniPreview data={{ frames: ['data:a'], delays: [10] } as any} alt="a" />);

    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:a');
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('resolves file path frames via convertFileSrc when frames_are_paths is true', async () => {
    const { AniPreview } = await import('@/components/CursorCustomization/AniPreview');

    render(
      <AniPreview
        data={{ frames: ['C:\\x\\frame.png'], frames_are_paths: true, delays: [10] } as any}
        alt="a"
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute('src', 'tauri:C:\\x\\frame.png');
  });

  it('requests animation frames when multiple frames exist', async () => {
    const { AniPreview } = await import('@/components/CursorCustomization/AniPreview');

    const rafSpy = vi.fn(() => 1);
    const cancelSpy = vi.fn();
    (globalThis as any).requestAnimationFrame = rafSpy;
    (globalThis as any).cancelAnimationFrame = cancelSpy;

    const { unmount } = render(<AniPreview data={{ frames: ['a', 'b'], delays: [10, 10] } as any} />);

    expect(rafSpy).toHaveBeenCalled();

    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });
});
