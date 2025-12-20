import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('components/ui/button-group', () => {
  it('renders children and applies group role', async () => {
    const { ButtonGroup, ButtonGroupText } = await import('@/components/ui/button-group');

    render(
      <ButtonGroup aria-label="grp">
        <button type="button">A</button>
        <button type="button">B</button>
        <ButtonGroupText>Txt</ButtonGroupText>
      </ButtonGroup>
    );

    expect(screen.getByRole('group', { name: 'grp' })).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Txt')).toBeInTheDocument();
  });
});
