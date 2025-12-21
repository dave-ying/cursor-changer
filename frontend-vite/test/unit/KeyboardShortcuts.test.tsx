/**
 * Comprehensive Vitest tests for KeyboardShortcuts.jsx
 * 
 * Tests cover:
 * - Component rendering
 * - Edit mode activation/deactivation
 * - Keyboard event capture and normalization
 * - Shortcut building and validation
 * - Apply/Cancel/Reset functionality
 * - Global hotkey enable/disable
 * - Event listener cleanup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ============================================================================
// MOCKS SETUP
// ============================================================================

// Create mock functions
const mockSetHotkey = vi.fn();
const mockSetShortcutEnabled = vi.fn();
const mockShowMessage = vi.fn();
const mockSetRecording = vi.fn();
const mockSetCapturedShortcut = vi.fn();
const mockSetOriginalShortcut = vi.fn();
const mockInvoke = vi.fn();

// Create a mock context that we can mutate
let mockAppContext = {
    cursorState: {
        shortcut: 'Ctrl+Shift+X',
        shortcutEnabled: false,
    },
    operations: {
        setHotkey: mockSetHotkey,
        setShortcutEnabled: mockSetShortcutEnabled,
    },
    recording: false,
    setRecording: mockSetRecording,
    capturedShortcut: null,
    setCapturedShortcut: mockSetCapturedShortcut,
    originalShortcut: null,
    setOriginalShortcut: mockSetOriginalShortcut,
    invoke: mockInvoke,
};

// Mock the AppContext module
vi.mock('@/context/AppContext', () => ({
    useApp: () => ({ invoke: mockInvoke }),
}));

vi.mock('@/context/MessageContext', () => ({
    useMessage: () => ({ showMessage: mockShowMessage }),
}));

vi.mock('@/store/useAppStore', () => ({
    useAppStore: (selector: any) => selector(mockAppContext),
}));

// Mock UI components
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, disabled, id, className, variant, size }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            data-testid={id}
            className={className}
        >
            {children}
        </button>
    ),
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({ children, className }) => (
        <div className={className}>{children}</div>
    ),
}));

vi.mock('@/components/ui/switch', () => ({
    Switch: ({ checked, onCheckedChange, id }) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            data-testid={id}
        />
    ),
}));

vi.mock('@/components/ui/kbd', () => ({
    Kbd: ({ children, className }) => (
        <kbd className={className}>{children}</kbd>
    ),
    KbdGroup: ({ children, className }) => (
        <div className={className}>{children}</div>
    ),
}));

// Import the component AFTER mocks are set up
import { KeyboardShortcuts } from '@/components/Settings/KeyboardShortcuts';

// ============================================================================
// TEST SETUP
// ============================================================================

beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset mock context to default state
    mockAppContext.cursorState.shortcut = 'Ctrl+Shift+X';
    mockAppContext.cursorState.shortcutEnabled = false;
    mockAppContext.recording = false;
    mockAppContext.capturedShortcut = null;
    mockAppContext.originalShortcut = null;

    // Default mock invoke behavior
    mockInvoke.mockResolvedValue(undefined);
});

// ============================================================================
// RENDERING TESTS
// ============================================================================

describe('KeyboardShortcuts - Rendering', () => {
    it('should render keyboard shortcuts section', () => {
        render(<KeyboardShortcuts />);
        expect(screen.getByText(/Keyboard Shortcuts/i)).toBeInTheDocument();
    });

    it('should render current shortcut display', () => {
        render(<KeyboardShortcuts />);

        // Check for shortcut label
        expect(screen.getByText(/Current Shortcut:/i)).toBeInTheDocument();

        // Check that shortcut parts are rendered
        expect(screen.getByText('Ctrl')).toBeInTheDocument();
        expect(screen.getByText('Shift')).toBeInTheDocument();
        expect(screen.getByText('X')).toBeInTheDocument();
    });

    it('should render shortcut toggle switch', () => {
        render(<KeyboardShortcuts />);
        const toggle = screen.getByTestId('keyboard-shortcut-enabled');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toBeChecked();
    });

    it('should render edit button', () => {
        render(<KeyboardShortcuts />);
        expect(screen.getByTestId('edit-btn')).toBeInTheDocument();
    });

    it('should render reset button', () => {
        render(<KeyboardShortcuts />);
        expect(screen.getByText('Reset')).toBeInTheDocument();
    });
});

// ============================================================================
// EDIT MODE TESTS
// ============================================================================

describe('KeyboardShortcuts - Edit Mode', () => {
    it('should enter edit mode when edit button clicked', async () => {
        render(<KeyboardShortcuts />);

        const editBtn = screen.getByTestId('edit-btn');
        fireEvent.click(editBtn);

        await waitFor(() => {
            expect(mockSetRecording).toHaveBeenCalledWith(true);
            expect(mockSetOriginalShortcut).toHaveBeenCalledWith('Ctrl+Shift+X');
            expect(mockSetCapturedShortcut).toHaveBeenCalledWith(null);
        });
    });

    it('should disable global hotkey when entering edit mode', async () => {
        render(<KeyboardShortcuts />);

        fireEvent.click(screen.getByTestId('edit-btn'));

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('set_hotkey_temporarily_enabled', {
                enabled: false
            });
        });
    });

    it('should show building shortcut display when in recording mode', () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        expect(screen.getByText(/Building Shortcut:/i)).toBeInTheDocument();
    });

    it('should show apply and cancel buttons in edit mode', () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        expect(screen.getByTestId('apply-btn')).toBeInTheDocument();
        expect(screen.getByTestId('cancel-btn')).toBeInTheDocument();
    });

    it('should disable apply button when no shortcut captured', () => {
        mockAppContext.recording = true;
        mockAppContext.capturedShortcut = null;
        render(<KeyboardShortcuts />);

        const applyBtn = screen.getByTestId('apply-btn');
        expect(applyBtn).toBeDisabled();
    });
});

// ============================================================================
// KEYBOARD CAPTURE TESTS
// ============================================================================

describe('KeyboardShortcuts - Keyboard Capture', () => {
    it('should capture Ctrl+A shortcut', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        // Simulate pressing Ctrl
        fireEvent.keyDown(window, { key: 'Control', repeat: false });

        // Simulate pressing A
        fireEvent.keyDown(window, { key: 'a', repeat: false });

        await waitFor(() => {
            expect(mockSetCapturedShortcut).toHaveBeenCalledWith('Ctrl+A');
        });
    });

    it('should capture Ctrl+Shift+Z shortcut', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        fireEvent.keyDown(window, { key: 'Control', repeat: false });
        fireEvent.keyDown(window, { key: 'Shift', repeat: false });
        fireEvent.keyDown(window, { key: 'z', repeat: false });

        await waitFor(() => {
            expect(mockSetCapturedShortcut).toHaveBeenCalledWith('Ctrl+Shift+Z');
        });
    });

    it('should ignore auto-repeated keydown events', () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        // Simulate holding down a key (repeat = true)
        fireEvent.keyDown(window, { key: 'a', repeat: true });

        expect(mockSetCapturedShortcut).not.toHaveBeenCalled();
    });

    it('should ignore Meta key', () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        fireEvent.keyDown(window, { key: 'Meta', repeat: false });

        expect(mockSetCapturedShortcut).not.toHaveBeenCalled();
    });

    it('should ignore CapsLock key', () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        fireEvent.keyDown(window, { key: 'CapsLock', repeat: false });

        expect(mockSetCapturedShortcut).not.toHaveBeenCalled();
    });
});

// ============================================================================
// KEY NORMALIZATION TESTS
// ============================================================================

describe('KeyboardShortcuts - Key Normalization', () => {
    it('should normalize Control to Ctrl', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        fireEvent.keyDown(window, { key: 'Control', repeat: false });
        fireEvent.keyDown(window, { key: 'a', repeat: false });

        await waitFor(() => {
            const calls = mockSetCapturedShortcut.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBe('Ctrl+A'); // Not 'Control+A'
        });
    });

    it('should uppercase non-modifier keys', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        fireEvent.keyDown(window, { key: 'Control', repeat: false });
        fireEvent.keyDown(window, { key: 'a', repeat: false }); // lowercase

        await waitFor(() => {
            const calls = mockSetCapturedShortcut.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBe('Ctrl+A'); // Uppercase A
        });
    });
});

// ============================================================================
// SHORTCUT VALIDATION TESTS
// ============================================================================

describe('KeyboardShortcuts - Shortcut Validation', () => {
    it('should sort modifiers in Ctrl-Shift-Alt order', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        // Press in different order: Alt, Ctrl, Shift, A
        fireEvent.keyDown(window, { key: 'Alt', repeat: false });
        fireEvent.keyDown(window, { key: 'Control', repeat: false });
        fireEvent.keyDown(window, { key: 'Shift', repeat: false });
        fireEvent.keyDown(window, { key: 'a', repeat: false });

        await waitFor(() => {
            const calls = mockSetCapturedShortcut.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBe('Ctrl+Shift+Alt+A'); // Correct order
        });
    });

    it('should replace previous non-modifier key when new one pressed', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        // Press Ctrl+A
        fireEvent.keyDown(window, { key: 'Control', repeat: false });
        fireEvent.keyDown(window, { key: 'a', repeat: false });

        // Then press B (should replace A)
        fireEvent.keyDown(window, { key: 'b', repeat: false });

        await waitFor(() => {
            const calls = mockSetCapturedShortcut.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBe('Ctrl+B'); // B replaced A
        });
    });
});

// ============================================================================
// APPLY/CANCEL/RESET TESTS
// ============================================================================

describe('KeyboardShortcuts - Actions', () => {
    it('should apply shortcut when apply button clicked', async () => {
        mockAppContext.recording = true;
        mockAppContext.capturedShortcut = 'Ctrl+Shift+A';
        render(<KeyboardShortcuts />);

        const applyBtn = screen.getByTestId('apply-btn');
        fireEvent.click(applyBtn);

        await waitFor(() => {
            expect(mockSetHotkey).toHaveBeenCalledWith('Ctrl+Shift+A');
            expect(mockSetRecording).toHaveBeenCalledWith(false);
            expect(mockSetCapturedShortcut).toHaveBeenCalledWith(null);
        });
    });

    it('should re-enable global hotkey after applying', async () => {
        mockAppContext.recording = true;
        mockAppContext.capturedShortcut = 'Ctrl+Shift+A';
        render(<KeyboardShortcuts />);

        fireEvent.click(screen.getByTestId('apply-btn'));

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('set_hotkey_temporarily_enabled', {
                enabled: true
            });
        });
    });

    it('should cancel edit mode when cancel button clicked', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        fireEvent.click(screen.getByTestId('cancel-btn'));

        await waitFor(() => {
            expect(mockSetRecording).toHaveBeenCalledWith(false);
            expect(mockSetCapturedShortcut).toHaveBeenCalledWith(null);
        });
    });

    it('should re-enable global hotkey after cancelling', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        fireEvent.click(screen.getByTestId('cancel-btn'));

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('set_hotkey_temporarily_enabled', {
                enabled: true
            });
        });
    });

    it('should reset shortcut to default', async () => {
        render(<KeyboardShortcuts />);

        const resetBtns = screen.getAllByText('Reset');
        fireEvent.click(resetBtns[0]);

        await waitFor(() => {
            expect(mockSetHotkey).toHaveBeenCalledWith('Ctrl+Shift+X');
        });
    });
});

// ============================================================================
// TOGGLE ENABLE/DISABLE TESTS
// ============================================================================

describe('KeyboardShortcuts - Enable/Disable', () => {
    it('should call setShortcutEnabled when toggle clicked', () => {
        render(<KeyboardShortcuts />);

        const toggle = screen.getByTestId('keyboard-shortcut-enabled');
        fireEvent.click(toggle);

        expect(mockSetShortcutEnabled).toHaveBeenCalled();
    });

    it('should exit edit mode when shortcut is disabled', async () => {
        mockAppContext.recording = true;
        mockAppContext.cursorState.shortcutEnabled = true;

        const { rerender } = render(<KeyboardShortcuts />);

        // Simulate disabling shortcut
        mockAppContext.cursorState.shortcutEnabled = false;
        rerender(<KeyboardShortcuts />);

        await waitFor(() => {
            expect(mockSetRecording).toHaveBeenCalledWith(false);
            expect(mockSetCapturedShortcut).toHaveBeenCalledWith(null);
        });
    });

    it('should re-enable global hotkey when disabled during edit', async () => {
        mockAppContext.recording = true;
        mockAppContext.cursorState.shortcutEnabled = true;

        const { rerender } = render(<KeyboardShortcuts />);

        mockAppContext.cursorState.shortcutEnabled = false;
        rerender(<KeyboardShortcuts />);

        await waitFor(() => {
            expect(mockInvoke).toHaveBeenCalledWith('set_hotkey_temporarily_enabled', {
                enabled: true
            });
        });
    });
});

// ============================================================================
// EVENT LISTENER CLEANUP TESTS
// ============================================================================

describe('KeyboardShortcuts - Cleanup', () => {
    it('should remove event listeners when component unmounts', () => {
        mockAppContext.recording = true;
        const { unmount } = render(<KeyboardShortcuts />);

        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('should remove event listeners when exiting recording mode', () => {
        mockAppContext.recording = true;
        const { rerender } = render(<KeyboardShortcuts />);

        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        // Exit recording mode
        mockAppContext.recording = false;
        rerender(<KeyboardShortcuts />);

        expect(removeEventListenerSpy).toHaveBeenCalled();
    });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('KeyboardShortcuts - Edge Cases', () => {
    it('should handle invoke failure when disabling hotkey', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockInvoke.mockRejectedValueOnce(new Error('Failed to disable'));

        render(<KeyboardShortcuts />);

        fireEvent.click(screen.getByTestId('edit-btn'));

        // Should not crash
        await waitFor(() => {
            expect(mockSetRecording).toHaveBeenCalledWith(true);
        });

        consoleError.mockRestore();
    });

    it('should handle rapid key presses', async () => {
        mockAppContext.recording = true;
        render(<KeyboardShortcuts />);

        // Rapidly press multiple keys
        fireEvent.keyDown(window, { key: 'Control', repeat: false });
        fireEvent.keyDown(window, { key: 'a', repeat: false });
        fireEvent.keyDown(window, { key: 'b', repeat: false });
        fireEvent.keyDown(window, { key: 'c', repeat: false });

        // Should handle gracefully and end up with Ctrl+C (last non-modifier)
        await waitFor(() => {
            const calls = mockSetCapturedShortcut.mock.calls;
            const lastCall = calls[calls.length - 1];
            expect(lastCall[0]).toBe('Ctrl+C');
        });
    });

    it('should display default shortcut when cursorState.shortcut is null', () => {
        mockAppContext.cursorState.shortcut = null;
        render(<KeyboardShortcuts />);

        // Should show default Ctrl+Shift+X
        expect(screen.getByText('Ctrl')).toBeInTheDocument();
        expect(screen.getByText('Shift')).toBeInTheDocument();
        expect(screen.getByText('X')).toBeInTheDocument();
    });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('KeyboardShortcuts - Integration', () => {
    it('should complete full edit workflow', async () => {
        const { rerender } = render(<KeyboardShortcuts />);

        // 1. Enter edit mode
        fireEvent.click(screen.getByTestId('edit-btn'));

        await waitFor(() => {
            expect(mockSetRecording).toHaveBeenCalledWith(true);
        });

        // 2. Simulate capturing shortcut
        mockAppContext.recording = true;
        mockAppContext.capturedShortcut = 'Ctrl+Shift+A';
        rerender(<KeyboardShortcuts />);

        // 3. Apply shortcut
        fireEvent.click(screen.getByTestId('apply-btn'));

        await waitFor(() => {
            expect(mockSetHotkey).toHaveBeenCalledWith('Ctrl+Shift+A');
            expect(mockSetRecording).toHaveBeenCalledWith(false);
        });
    });

    it('should complete full cancel workflow', async () => {
        const { rerender } = render(<KeyboardShortcuts />);

        // 1. Enter edit mode
        fireEvent.click(screen.getByTestId('edit-btn'));

        await waitFor(() => {
            expect(mockSetRecording).toHaveBeenCalledWith(true);
        });

        // 2. Simulate capturing shortcut
        mockAppContext.recording = true;
        mockAppContext.capturedShortcut = 'Ctrl+A';
        rerender(<KeyboardShortcuts />);

        // 3. Cancel
        fireEvent.click(screen.getByTestId('cancel-btn'));

        await waitFor(() => {
            expect(mockSetRecording).toHaveBeenCalledWith(false);
            expect(mockSetCapturedShortcut).toHaveBeenCalledWith(null);
        });
    });
});
