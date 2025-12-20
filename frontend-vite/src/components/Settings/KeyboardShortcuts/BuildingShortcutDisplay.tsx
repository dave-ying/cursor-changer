import React from 'react';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { isModifierKey, sortModifiers, type ModifierKey } from '../../../utils/keyboardUtils';

 type BuildingShortcutDisplayProps = {
     pressedKeys?: Set<string>;
     capturedShortcut?: string | null;
 };

/**
 * BuildingShortcutDisplay - Shows the real-time shortcut being built
 * @param {Object} props
 * @param {Set<string>} props.pressedKeys - Currently pressed keys
 * @param {string|null} props.capturedShortcut - Captured shortcut string
 */
export function BuildingShortcutDisplay({ pressedKeys, capturedShortcut }: BuildingShortcutDisplayProps) {
    const renderKeys = () => {
        // If user is currently pressing keys, show what's being pressed
        if (pressedKeys && pressedKeys.size > 0) {
            // Separate modifiers and non-modifiers
            const modifiers: ModifierKey[] = [];
            const nonModifiers: string[] = [];

            pressedKeys.forEach(key => {
                if (isModifierKey(key)) {
                    modifiers.push(key);
                } else {
                    nonModifiers.push(key);
                }
            });

            // Sort modifiers and combine with non-modifiers
            const sortedModifiers = sortModifiers(modifiers);
            const keys = [...sortedModifiers, ...nonModifiers];

            return keys.map((key, index) => (
                <Kbd
                    key={index}
                    className="text-base px-3 py-1.5 transition-all opacity-100"
                >
                    {key}
                </Kbd>
            ));
        }

        // If no keys are pressed but we have a captured shortcut, show it
        if (capturedShortcut) {
            return capturedShortcut.split('+').map((key, index) => (
                <Kbd
                    key={index}
                    className="text-base px-3 py-1.5 transition-all opacity-100"
                >
                    {key}
                </Kbd>
            ));
        }

        // Nothing pressed and no captured shortcut yet - show placeholder
        return (
            <Kbd className="text-base px-3 py-1.5 opacity-40 border-dashed">
                ?
            </Kbd>
        );
    };

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Building Shortcut:</span>
            <KbdGroup className="text-base">
                {renderKeys()}
            </KbdGroup>
            <span className="text-xs text-muted-foreground italic">
                Press and hold any keyboard combination
            </span>
            <span className="text-xs text-muted-foreground">
                Modifiers: CTRL, SHIFT, ALT
            </span>
        </div>
    );
}
