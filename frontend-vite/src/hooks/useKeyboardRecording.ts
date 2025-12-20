import { useState, useEffect } from 'react';
import { normalizeKey, isModifierKey, buildShortcutString } from '../utils/keyboardUtils';

/**
 * Custom hook for recording keyboard shortcuts
 * @param recording - Whether recording is active
 * @param capturedShortcut - Currently captured shortcut
 * @param setCapturedShortcut - Function to update captured shortcut
 * @returns { pressedKeys, buildingShortcut }
 */
export function useKeyboardRecording(
  recording: boolean,
  capturedShortcut: string | null,
  setCapturedShortcut: (shortcut: string | null) => void
): { pressedKeys: Set<string>; buildingShortcut: string | null } {
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

    // Reset pressed keys when recording stops
    useEffect(() => {
        if (!recording) {
            setPressedKeys(new Set());
        }
    }, [recording]);

    useEffect(() => {
        if (!recording) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore auto-repeated keydown events (holding a key down)
            if (e.repeat) return;

            // Prevent default for all keys while recording
            e.preventDefault();

            const key = e.key;
            const normalizedKey = normalizeKey(key);

            if (!normalizedKey) return;

            // If a modifier is pressed and we already have a captured shortcut, reset
            if (isModifierKey(normalizedKey) && capturedShortcut) {
                setCapturedShortcut(null);
                setPressedKeys(new Set([normalizedKey]));
                return;
            }

            // Add to pressed keys
            const newPressed = new Set(pressedKeys);

            // If this is a non-modifier key, remove any existing non-modifier keys first
            // (shortcuts can only have one non-modifier key)
            if (!isModifierKey(normalizedKey)) {
                // Remove all non-modifier keys
                for (const key of newPressed) {
                    if (!isModifierKey(key)) {
                        newPressed.delete(key);
                    }
                }
            }

            newPressed.add(normalizedKey);
            setPressedKeys(newPressed);

            // Build shortcut if we have valid combination
            const newShortcut = buildShortcutString(newPressed);
            if (newShortcut) {
                setCapturedShortcut(newShortcut);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key;
            const normalizedKey = normalizeKey(key);

            if (!normalizedKey) return;

            // Remove from pressed keys
            const newPressed = new Set(pressedKeys);
            newPressed.delete(normalizedKey);
            setPressedKeys(newPressed);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [recording, pressedKeys, capturedShortcut, setCapturedShortcut]);

    // Build the "building shortcut" display string
    const buildingShortcut = buildShortcutString(pressedKeys);

    return { pressedKeys, buildingShortcut };
}