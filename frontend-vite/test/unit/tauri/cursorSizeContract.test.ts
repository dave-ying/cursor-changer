import { describe, expect, it } from 'vitest';

import { MAX_CURSOR_SIZE } from '@/constants/cursorConstants';
import rustSource from '../../../../src-tauri/src/cursor_converter/cur_generator.rs?raw';

describe('Cursor size contract', () => {
  it('frontend MAX_CURSOR_SIZE matches Rust cursor_converter::MAX_CURSOR_SIZE', () => {
    const match = rustSource.match(/pub const MAX_CURSOR_SIZE:\s*u32\s*=\s*(\d+)\s*;/);

    expect(match).toBeTruthy();

    const rustMax = Number(match![1]);
    expect(rustMax).toBe(MAX_CURSOR_SIZE);
  });
});
