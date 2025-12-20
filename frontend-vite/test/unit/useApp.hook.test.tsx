import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useApp } from '@/context/AppContext';

function Consumer() {
  // Intentionally call useApp outside provider
  useApp();
  return <div>noop</div>;
}

describe('useApp hook', () => {
  it('throws when used outside AppProvider', () => {
    expect(() => render(<Consumer />)).toThrow(
      'useApp must be used within AppProvider'
    );
  });
});
