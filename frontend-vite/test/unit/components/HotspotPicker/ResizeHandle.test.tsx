import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';

describe('HotspotPicker/ResizeHandle', () => {
  it('calls onMouseDown with corner and updates scale on hover', async () => {
    const { ResizeHandle } = await import('@/components/HotspotPicker/ResizeHandle');

    const onMouseDown = vi.fn();
    const { container } = render(<ResizeHandle corner="top-left" onMouseDown={onMouseDown as any} />);

    const el = container.firstElementChild as HTMLDivElement;
    expect(el).toBeTruthy();

    fireEvent.mouseDown(el);
    expect(onMouseDown).toHaveBeenCalledWith(expect.anything(), 'top-left');

    fireEvent.mouseEnter(el);
    expect(el.style.transform).toBe('scale(1.3)');

    fireEvent.mouseLeave(el);
    expect(el.style.transform).toBe('scale(1)');
  });
});
