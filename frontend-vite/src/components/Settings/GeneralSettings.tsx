import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { persistentKeys } from '@/constants/persistentKeys';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function GeneralSettings() {
  const cursorState = useAppStore((s) => s.cursorState);
  const setMinimizeToTray = useAppStore((s) => s.operations.setMinimizeToTray);
  const setRunOnStartup = useAppStore((s) => s.operations.setRunOnStartup);
  const resetAllSettings = useAppStore((s) => s.operations.resetAllSettings);
  const setRecording = useAppStore((s) => s.setRecording);
  const setCapturedShortcut = useAppStore((s) => s.setCapturedShortcut);
  const setOriginalShortcut = useAppStore((s) => s.setOriginalShortcut);

  const [resetDialogOpen, setResetDialogOpen] = useState<boolean>(false);

  const handleResetAllSettings = async () => {
    try {
      try {
        sessionStorage.setItem('cursor-changer:persistenceSuspendUntil', String(Date.now() + 2000));
      } catch (_error) {
        // ignore
      }
      await resetAllSettings();
      // Reset local recording state if any (though KeyboardShortcuts handles its own,
      // we clear global state here just in case)
      setRecording(false);
      setCapturedShortcut(null);
      setOriginalShortcut(null);
      // Force cursor size to reset to default by updating the global state
      const setCursorSize = useAppStore.getState().operations.setCursorSize;
      await setCursorSize('32');
      // Reset Library preview scale to default by setting it directly
      // This ensures the usePersistentState hook updates properly
      localStorage.setItem(persistentKeys.library.previewScale, '1.65');
      // Reset other Library-related localStorage items
      localStorage.removeItem(persistentKeys.library.showCustomizePanel);
      localStorage.removeItem(persistentKeys.library.showMoreOptions);
      localStorage.removeItem(persistentKeys.activeSection.showCursorNames);
      setResetDialogOpen(false);
      // Reload page to ensure all components re-read their default values
      // (delay ensures localStorage writes are fully committed before reload)
      setTimeout(() => window.location.reload(), 50);
    } catch (_error) {
      // Error already shown in resetAllSettings
      setResetDialogOpen(false);
    }
  };

  return (
    <>
      {/* General Settings Section */}
      <section id="general-settings-section">
        <h2 className="mb-3 text-base font-semibold text-foreground">General Settings</h2>
        <Card className="p-4 sm:p-5 bg-muted/30 border-muted-foreground/20">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-base">Minimize to Tray</strong>
            <Switch
              id="minimize-to-tray"
              checked={cursorState.minimizeToTray}
              onCheckedChange={setMinimizeToTray}
              aria-label="Minimize to Tray"
            />
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between gap-3">
            <strong className="text-base break-words">Run Cursor Changer when my computer starts</strong>
            <Switch
              id="run-on-startup"
              checked={cursorState.runOnStartup}
              onCheckedChange={setRunOnStartup}
              aria-label="Run cursor changer on startup"
            />
          </div>
        </Card>

        {/* Standalone Reset All Settings button */}
        <div className="mt-6 flex justify-center">
          <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button id="reset-all-settings-btn" variant="destructive" className="w-full sm:w-auto rounded-full transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]">Reset All Settings</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Settings</AlertDialogTitle>
                <AlertDialogDescription>
                  This will reset all settings to their default values.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">What will be reset:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                    <li>All active cursor assignments</li>
                    <li>Cursor size settings (including Library cursor size)</li>
                    <li>Library preview scale and layout settings</li>
                    <li>Keyboard shortcut preferences</li>
                    <li>Theme and accent color</li>
                    <li>Startup and tray preferences</li>
                  </ul>
                </div>
                <div className="pt-2 border-t border-muted-foreground/20">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ Your Library cursors will be kept</p>
                  <p className="text-xs text-muted-foreground mt-1">All cursors you've added to your Library remain untouched.</p>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetAllSettings} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]">Reset All Settings</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </>
  );
}