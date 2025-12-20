import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const setActiveSection = vi.fn();

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: any) =>
    selector({
      activeSection: 'cursor-customization',
      setActiveSection,
    })
}));

describe('components/Sidebar', () => {
  it('renders primary sections and calls setActiveSection when clicked', async () => {
    const { Sidebar } = await import('@/components/Sidebar');

    render(<Sidebar />);

    expect(screen.getByRole('tab', { name: 'Customize' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(setActiveSection).toHaveBeenCalledWith('settings');
  });
});
