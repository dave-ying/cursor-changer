import React from 'react';
import { Button } from '@/components/ui/button';

type ShortcutActionsProps = {
    isEditing: boolean;
    capturedShortcut?: string | null;
    onEdit?: () => void;
    onApply?: () => void;
    onCancel?: () => void;
    onReset: () => void;
};

/**
 * ShortcutActions - Action buttons for keyboard shortcut management
 * @param {Object} props
 * @param {boolean} props.isEditing - Whether in edit mode
 * @param {string|null} props.capturedShortcut - Captured shortcut string
 * @param {function} props.onEdit - Edit button handler
 * @param {function} props.onApply - Apply button handler
 * @param {function} props.onCancel - Cancel button handler
 * @param {function} props.onReset - Reset button handler
 */
export function ShortcutActions({
    isEditing,
    capturedShortcut,
    onEdit,
    onApply,
    onCancel,
    onReset
}: ShortcutActionsProps) {
    if (isEditing) {
        // Edit mode: Show Apply, Cancel, and Reset buttons
        return (
            <div className="flex justify-end gap-2 sm:gap-3 pt-2">
                <Button
                    id="cancel-btn"
                    onClick={onCancel}
                    variant="destructive"
                    className="flex-1 sm:flex-initial rounded-full transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
                >
                    Cancel
                </Button>
                <Button
                    id="apply-btn"
                    onClick={onApply}
                    disabled={!capturedShortcut}
                    variant="default"
                    className="flex-1 sm:flex-initial rounded-full transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
                >
                    Apply
                </Button>
                <Button
                    id="reset-shortcut-btn"
                    variant="secondary"
                    onClick={onReset}
                    className="flex-1 sm:flex-initial rounded-full transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
                >
                    Reset
                </Button>
            </div>
        );
    }

    // View mode: Show Edit and Reset buttons
    return (
        <div className="flex justify-end gap-2 sm:gap-3">
            <Button
                id="edit-btn"
                onClick={onEdit}
                variant="default"
                className="flex-1 sm:flex-initial rounded-full transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
            >
                Edit
            </Button>
            <Button
                id="reset-shortcut-btn"
                variant="secondary"
                onClick={onReset}
                className="flex-1 sm:flex-initial rounded-full transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]"
            >
                Reset
            </Button>
        </div>
    );
}
