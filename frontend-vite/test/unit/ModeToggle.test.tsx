import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModeToggle } from '@/components/CursorCustomization/ModeToggle';

describe('ModeToggle', () => {
  it('renders with pill (rounded-full) container and item buttons', () => {
    render(<ModeToggle value="simple" onValueChange={() => { }} />);

    const simpleButton = screen.getByRole('radio', { name: /simple/i });
    const advancedButton = screen.getByRole('radio', { name: /advanced/i });

    const container = simpleButton.closest('[role="group"]') as HTMLElement | null;
    expect(container).toBeTruthy();
    expect(container!.className).toMatch(/rounded-full/);

    // Each item should have rounded-full class to get the pill effect
    expect(simpleButton.className).toMatch(/rounded-full/);
    expect(advancedButton.className).toMatch(/rounded-full/);
  });
});
