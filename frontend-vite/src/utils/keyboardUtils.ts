/**
 * Utility functions for keyboard key handling and shortcut processing
 */

// Define types for keyboard keys
export type NormalizedKey = 'Ctrl' | 'Shift' | 'Alt' | string | null;
export type ModifierKey = 'Ctrl' | 'Shift' | 'Alt';

/**
 * Normalize key name
 * @param key - Raw key from keyboard event
 * @returns Normalized key name or null if should be ignored
 */
export function normalizeKey(key: string): NormalizedKey {
    // Normalize modifier keys
    if (key === 'Control') return 'Ctrl';
    if (key === 'Shift') return 'Shift';
    if (key === 'Alt') return 'Alt';

    // Ignore these keys
    if (key === 'Meta' || key === 'CapsLock') return null;

    // Uppercase non-modifier keys
    return key.toUpperCase();
}

/**
 * Check if a key is a modifier key
 * @param key - Normalized key name
 * @returns boolean
 */
export function isModifierKey(key: string): key is ModifierKey {
    return ['Ctrl', 'Shift', 'Alt'].includes(key);
}

/**
 * Sort modifiers in standard order: Ctrl -> Shift -> Alt
 * @param modifiers - Array of modifier keys
 * @returns Sorted modifiers
 */
export function sortModifiers(modifiers: ModifierKey[]): ModifierKey[] {
    const modifierOrder: Record<ModifierKey, number> = { 'Ctrl': 0, 'Shift': 1, 'Alt': 2 };
    return modifiers.sort((a, b) => modifierOrder[a] - modifierOrder[b]);
}

/**
 * Build shortcut string from a Set of pressed keys
 * @param keys - Set of normalized key names
 * @returns Formatted shortcut string or null if invalid
 */
export function buildShortcutString(keys: Set<string>): string | null {
    const modifiers: string[] = [];
    const nonModifiers: string[] = [];

    keys.forEach(key => {
        if (isModifierKey(key)) {
            modifiers.push(key);
        } else {
            nonModifiers.push(key);
        }
    });

    // Only valid if we have at least one modifier and one non-modifier
    if (modifiers.length > 0 && nonModifiers.length > 0) {
        const sortedModifiers = sortModifiers(modifiers as ModifierKey[]);
        return [...sortedModifiers, ...nonModifiers].join('+');
    }

    return null;
}

/**
 * Parse shortcut string into parts
 * @param shortcut - Shortcut string like "Ctrl+Shift+A"
 * @returns Array of key parts
 */
export function parseShortcut(shortcut: string): string[] {
    return shortcut ? shortcut.split('+') : [];
}