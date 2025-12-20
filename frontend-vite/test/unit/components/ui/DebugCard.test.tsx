import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('components/ui/debug-card', () => {
  it('renders DebugCard wrapper', async () => {
    const { DebugCard } = await import('@/components/ui/debug-card');
    render(<DebugCard data-testid="dbg">X</DebugCard>);
    expect(screen.getByTestId('dbg')).toBeInTheDocument();
  });
});
