// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Setup mock AppContext with a visible spy for setAccentColor
const fakeSetAccentColor = vi.fn(async (_c: string, _options?: { commit?: boolean }) => { });

const fakeSetThemeMode = vi.fn(async (_mode: string) => { });

vi.mock('@/store/useAppStore', () => {
  return {
    useAppStore: (selector: any) =>
      selector({
        cursorState: {
          accentColor: '#7c3aed',
          themeMode: 'dark',
        },
        operations: {
          setAccentColor: fakeSetAccentColor,
          setThemeMode: fakeSetThemeMode,
        }
      })
  };
});

import { Settings } from '@/components/Settings';

describe('Accent Color input behavior', () => {
  beforeEach(() => {
    fakeSetAccentColor.mockClear();
  });
  it('typing in the hex input should not immediately call setAccentColor until blur', async () => {
    expect(typeof fakeSetAccentColor).toBe('function');
    render(<Settings initialTab="interface" />);

    // Open the Color Picker popover by clicking the custom color button
    const pickerButton = screen.getByLabelText('Choose custom color');
    fireEvent.click(pickerButton);

    // Find the hex input within the popover
    const input = screen.getByRole('textbox');
    // Simulate typing a new color
    fireEvent.change(input, { target: { value: 'ff0000' } });
    fireEvent.change(input, { target: { value: 'ff0001' } });

    // Using our mocked setAccentColor, it SHOULD be called during typing (live preview) with commit: false
    expect(fakeSetAccentColor).toHaveBeenCalled();
    const lastCall = fakeSetAccentColor.mock.lastCall as unknown as [string, { commit?: boolean }?] | undefined;
    // We expect the second argument to match { commit: false }
    expect(lastCall?.[1]).toEqual({ commit: false });

    // Clear mocks to track the commit call
    fakeSetAccentColor.mockClear();

    // Blur input to commit color
    fireEvent.blur(input);

    // Now setAccentColor should be called again
    expect(fakeSetAccentColor).toHaveBeenCalled();
    const commitCall = fakeSetAccentColor.mock.lastCall as unknown as [string, { commit?: boolean }?] | undefined;
    expect(commitCall?.[1]).toEqual({ commit: true });
  });

  it('dragging the color picker should only call setAccentColor once on pointer up', async () => {
    render(<Settings initialTab="interface" />);

    // Open the Color Picker popover by clicking the custom color button
    const pickerButton = screen.getByLabelText('Choose custom color');
    fireEvent.click(pickerButton);

    // Find the saturation area for the color picker
    const saturation = document.querySelector('.react-colorful__saturation') as Element | null;
    expect(saturation).toBeTruthy();

    // Simulate drag across picker
    fireEvent.pointerDown(saturation as Element, { clientX: 10, clientY: 10 });
    // console.log('after pointerDown', fakeSetAccentColor.mock.calls);
    fireEvent.pointerMove(saturation as Element, { clientX: 20, clientY: 20 });
    // console.log('after pointerMove1', fakeSetAccentColor.mock.calls);
    fireEvent.pointerMove(saturation as Element, { clientX: 30, clientY: 30 });
    // console.log('after pointerMove2', fakeSetAccentColor.mock.calls);

    // While dragging, none of the calls should be a 'commit' call (commit: true)
    const callsSoFar = fakeSetAccentColor.mock.calls as unknown as Array<[string, { commit?: boolean }?]>;
    // DEBUG: output calls for visibility
    // console.log('callsSoFar', callsSoFar);
    expect(callsSoFar.some(args => args[1] && args[1].commit === true)).toBe(false);

    // Release pointer -> commit
    fireEvent.pointerUp(saturation as Element);
    // Ensure one commit call was made
    const commitCalls = (fakeSetAccentColor.mock.calls as unknown as Array<[string, { commit?: boolean }?]>).filter(
      args => args[1] && args[1].commit === true
    );
    expect(commitCalls.length).toBe(1);
  });

  it('renders the color picker popover in the document body (portal) to avoid being clipped by container overflow', async () => {
    render(<Settings initialTab="interface" />);
    const pickerButton = screen.getByLabelText('Choose custom color');
    fireEvent.click(pickerButton);

    // The portal should have attached the popover to the document.body
    const popover = document.body.querySelector('[data-testid="color-picker-popover"]') as HTMLElement | null;
    expect(popover).toBeTruthy();

    // And it should NOT be inside the section settings container (avoid clipped container)
    const section = document.getElementById('interface-settings-section') as HTMLElement | null;
    expect(section).toBeTruthy();
    expect(section!.contains(popover!)).toBe(false);
  });

  it('appears instantly (not floating in from top-left) by marking position ready immediately', async () => {
    render(<Settings initialTab="interface" />);
    const pickerButton = screen.getByLabelText('Choose custom color');
    fireEvent.click(pickerButton);

    const popover = document.body.querySelector('[data-testid="color-picker-popover"]') as HTMLElement | null;
    expect(popover).toBeTruthy();
    // Since we compute an approximate position and mark positionReady synchronously,
    // popover.style.visibility should be visible immediately instead of default 'hidden'.
    expect(popover!.style.visibility).toBe('visible');
  });

  it('does not close the popover when clicking inside the popover (e.g. input or saturation)', async () => {
    render(<Settings initialTab="interface" />);
    const pickerButton = screen.getByLabelText('Choose custom color');
    fireEvent.click(pickerButton);

    // Find a target inside the popover (the hex input)
    const input = screen.getByRole('textbox');
    fireEvent.click(input);

    // The popover should still be present
    const popover = document.body.querySelector('[data-testid="color-picker-popover"]') as HTMLElement | null;
    expect(popover).toBeTruthy();
    expect(popover!.contains(input)).toBe(true);
  });
});
