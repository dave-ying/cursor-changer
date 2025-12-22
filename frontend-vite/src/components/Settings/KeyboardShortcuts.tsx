import React, { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useMessage } from '@/hooks/useMessage';
import { useAppStore } from '@/store/useAppStore';
import { defaultCursorState } from '@/store/slices/cursorStateStore';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { useKeyboardRecording } from '../../hooks/useKeyboardRecording';
import { BuildingShortcutDisplay } from './KeyboardShortcuts/BuildingShortcutDisplay';
import { ShortcutActions } from './KeyboardShortcuts/ShortcutActions';
import { Commands } from '../../tauri/commands';
import { logger } from '../../utils/logger';
import { invokeWithFeedback } from '../../store/operations/invokeWithFeedback';
import type { Message } from '../../store/slices/uiStateStore';

export function KeyboardShortcuts() {
    const { invoke } = useApp();
    const { showMessage } = useMessage();

    const cursorState = useAppStore((s) => s.cursorState);
    const setHotkey = useAppStore((s) => s.operations.setHotkey);
    const setShortcutEnabled = useAppStore((s) => s.operations.setShortcutEnabled);
    const recording = useAppStore((s) => s.recording);
    const setRecording = useAppStore((s) => s.setRecording);
    const capturedShortcut = useAppStore((s) => s.capturedShortcut);
    const setCapturedShortcut = useAppStore((s) => s.setCapturedShortcut);
    const setOriginalShortcut = useAppStore((s) => s.setOriginalShortcut);

    const showMessageTyped = React.useCallback(
        (text: string, type?: Message['type']) => {
            const normalized: Message['type'] | undefined = type === '' || type === undefined ? undefined : type;
            showMessage(text, normalized);
        },
        [showMessage]
    );

    const defaultShortcut = defaultCursorState.shortcut ?? 'Ctrl+Shift+X';

    // Use custom hook for keyboard recording
    const { pressedKeys, buildingShortcut: _buildingShortcut } = useKeyboardRecording(
        recording,
        capturedShortcut,
        setCapturedShortcut
    );

    const handleEditShortcut = async () => {
        setRecording(true);
        setOriginalShortcut(cursorState.shortcut || defaultShortcut);
        setCapturedShortcut(null);

        // Disable the global hotkey while recording
        const result = await invokeWithFeedback(invoke, Commands.setHotkeyTemporarilyEnabled, {
            args: { enabled: false },
            logLabel: '[KeyboardShortcuts] Failed to disable hotkey while recording:',
            errorMessage: 'Failed to disable hotkey for recording',
            errorType: 'error'
        });
        if (result.status !== 'success') return;
        showMessageTyped('Press any keyboard combination', 'info');
    };

    const handleApplyShortcut = async () => {
        if (!capturedShortcut) {
            showMessage('No shortcut captured', 'error');
            return;
        }

        try {
            await setHotkey(capturedShortcut);
            setRecording(false);
            setCapturedShortcut(null);
            setOriginalShortcut(null);

            // Re-enable the global hotkey
            await invokeWithFeedback(invoke, Commands.setHotkeyTemporarilyEnabled, {
                args: { enabled: true },
                logLabel: '[KeyboardShortcuts] Failed to re-enable hotkey after apply:',
                errorMessage: 'Failed to re-enable hotkey after apply',
                errorType: 'error'
            });
            showMessageTyped('Shortcut updated successfully', 'success');
        } catch (_error) {
            // Error already shown in setHotkey
            setRecording(false);

            //Re-enable the global hotkey even on error
            await invokeWithFeedback(invoke, Commands.setHotkeyTemporarilyEnabled, {
                args: { enabled: true },
                logLabel: '[KeyboardShortcuts] Failed to re-enable hotkey after error:',
                errorMessage: 'Failed to re-enable hotkey after error',
                errorType: 'error'
            });
        }
    };

    const handleCancelEdit = async () => {
        setRecording(false);
        setCapturedShortcut(null);
        setOriginalShortcut(null);

        // Re-enable the global hotkey
        await invokeWithFeedback(invoke, Commands.setHotkeyTemporarilyEnabled, {
            args: { enabled: true },
            logLabel: '[KeyboardShortcuts] Failed to re-enable hotkey on cancel:',
            errorMessage: 'Failed to re-enable hotkey on cancel',
            errorType: 'error'
        });
        showMessageTyped('Shortcut editing cancelled', 'info');
    };

    const handleResetShortcut = async () => {
        try {
            await setHotkey(defaultShortcut);
            showMessage('Shortcut reset to default', 'success');
        } catch (_error) {
            // Error already shown
        }
    };

    // Exit edit mode when shortcut is disabled
    useEffect(() => {
        if (!cursorState.shortcutEnabled && recording) {
            // User toggled off the shortcut while in edit mode - cancel editing
            setRecording(false);
            setCapturedShortcut(null);
            setOriginalShortcut(null);

            // Re-enable the global hotkey
            invokeWithFeedback(invoke, Commands.setHotkeyTemporarilyEnabled, {
                args: { enabled: true },
                logLabel: '[KeyboardShortcuts] Failed to re-enable hotkey while disabling:',
            }).catch((error) => logger.error('Failed to re-enable hotkey:', error));
        }
    }, [cursorState.shortcutEnabled, recording, setRecording, setCapturedShortcut, setOriginalShortcut, invoke]);

    return (
        <section id="keyboard-shortcuts-section">
            <h2 className="mb-3 text-base font-semibold text-foreground">Keyboard Shortcuts</h2>
            <Card className="p-4 sm:p-5 bg-muted/30 border-muted-foreground/20">
                <div className="flex items-center justify-between mb-4 gap-3">
                    <strong className="text-base">Hide/Show Cursor</strong>
                    <Switch
                        id="keyboard-shortcut-enabled"
                        checked={cursorState.shortcutEnabled}
                        onCheckedChange={setShortcutEnabled}
                        aria-label="Toggle keyboard shortcut"
                    />
                </div>

                <div id="keyboard-shortcut-content" className={!cursorState.shortcutEnabled ? 'opacity-50 pointer-events-none' : ''}>
                    {recording ? (
                        <div className="space-y-4">
                            {/* Building Shortcut */}
                            <BuildingShortcutDisplay
                                pressedKeys={pressedKeys}
                                capturedShortcut={capturedShortcut}
                            />

                            {/* Action Buttons */}
                            <ShortcutActions
                                isEditing={true}
                                capturedShortcut={capturedShortcut}
                                onApply={handleApplyShortcut}
                                onCancel={handleCancelEdit}
                                onReset={handleResetShortcut}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <strong className="text-base">Current Shortcut:</strong>
                                <KbdGroup className="text-base">
                                    {(cursorState.shortcut || defaultShortcut).split('+').map((key, index) => (
                                        <Kbd key={index} className="text-base px-3 py-1.5">{key}</Kbd>
                                    ))}
                                </KbdGroup>
                            </div>
                            <ShortcutActions
                                isEditing={false}
                                onEdit={handleEditShortcut}
                                onReset={handleResetShortcut}
                            />
                        </div>
                    )}
                </div>
            </Card>
        </section>
    );
}