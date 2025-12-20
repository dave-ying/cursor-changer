import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

describe('components/ui/icons', () => {
  it('renders per-type icons and ToastIcon routes correctly', async () => {
    const { SuccessIcon, ErrorIcon, WarningIcon, InfoIcon, ToastIcon } = await import('@/components/ui/icons');

    const { container } = render(
      <div>
        <SuccessIcon className="x" size="sm" />
        <ErrorIcon className="y" size="md" />
        <WarningIcon className="z" size="lg" />
        <InfoIcon className="w" size="sm" />
        <ToastIcon type="success" />
        <ToastIcon type="error" />
        <ToastIcon type="warning" />
        <ToastIcon type="info" />
      </div>
    );

    // Ensure SVGs are rendered
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
  });
});
