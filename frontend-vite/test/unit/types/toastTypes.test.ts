import { describe, it, expect } from 'vitest';
import { TOAST_POSITIONS_MAP } from '@/types/toastTypes';

describe('types/toastTypes', () => {
  it('exports position class mappings for all four positions', () => {
    expect(Object.keys(TOAST_POSITIONS_MAP).sort()).toEqual(
      ['bottom-left', 'bottom-right', 'top-left', 'top-right'].sort()
    );

    expect(TOAST_POSITIONS_MAP['top-right']!.container).toContain('top-4');
    expect(TOAST_POSITIONS_MAP['top-right']!.container).toContain('right-4');
  });
});
