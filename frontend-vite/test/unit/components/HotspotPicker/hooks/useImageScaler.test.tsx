import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useImageScaler } from '@/components/HotspotPicker/hooks/useImageScaler';

describe('HotspotPicker/hooks/useImageScaler', () => {
  it('calculateFitScale returns 1 when image is missing', () => {
    const imgRef = { current: null } as React.RefObject<HTMLImageElement | null>;

    const { result } = renderHook(() =>
      useImageScaler({ imgRef, targetSize: 256, objectUrl: null, cursorInfo: null })
    );

    expect(result.current.calculateFitScale()).toBe(1);
  });

  it('calculateFitScale fits to canvas without upscaling', () => {
    const img = { naturalWidth: 50, naturalHeight: 50, width: 50, height: 50 } as any as HTMLImageElement;
    const imgRef = { current: img } as React.RefObject<HTMLImageElement | null>;

    const { result } = renderHook(() =>
      useImageScaler({ imgRef, targetSize: 256, objectUrl: 'blob:x', cursorInfo: null })
    );

    // Would be scale 5.12, but clamp to 1
    expect(result.current.calculateFitScale()).toBe(1);
  });

  it('calculateFitScale scales down based on the limiting dimension', () => {
    const img = { naturalWidth: 200, naturalHeight: 50, width: 200, height: 50 } as any as HTMLImageElement;
    const imgRef = { current: img } as React.RefObject<HTMLImageElement | null>;

    const { result } = renderHook(() =>
      useImageScaler({ imgRef, targetSize: 100, objectUrl: 'blob:x', cursorInfo: null })
    );

    expect(result.current.calculateFitScale()).toBe(0.5);
  });
});
