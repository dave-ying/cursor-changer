import React from 'react';
import { useApp } from '../../context/AppContext';
import { useMessage } from '../../context/MessageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { Commands, invokeCommand } from '../../tauri/commands';
import { logger } from '../../utils/logger';

export function LibrarySettings() {
  const { invoke } = useApp();
  const { showMessage } = useMessage();
  const [resetLibraryDialogOpen, setResetLibraryDialogOpen] = React.useState(false);

  const handleOpenFolder = async () => {
    try {
      await invokeCommand(invoke, Commands.showLibraryCursorsFolder);
    } catch (error) {
      logger.error('Failed to open library folder:', error);
      showMessage('Failed to open library folder: ' + error, 'error');
    }
  };

  const handleResetLibrary = async () => {
    try {
      await invokeCommand(invoke, Commands.resetLibrary);
      await invokeCommand(invoke, Commands.syncLibraryWithFolder);
      showMessage('Library reset to defaults', 'success');
    } catch (error) {
      logger.error('Failed to reset library:', error);
      showMessage('Failed to reset library: ' + String(error), 'error');
    } finally {
      setResetLibraryDialogOpen(false);
    }
  };

  return (
    <section id="library-settings-section" className="mt-6">
      <h2 className="mb-3 text-base font-semibold text-foreground">Library Settings</h2>
      <Card className="p-4 sm:p-5 bg-muted/30 border-muted-foreground/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <strong className="text-base">Library Cursors Folder</strong>
            <p className="text-sm text-muted-foreground mt-0.5">
              Open the folder where your custom cursors are stored
            </p>
          </div>
          <Button
            id="show-library-folder-btn"
            className="sm:w-auto rounded-full"
            onClick={handleOpenFolder}
          >
            Open Folder
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between">
          <strong className="text-base">Reset All Cursors in Library</strong>
          <AlertDialog open={resetLibraryDialogOpen} onOpenChange={setResetLibraryDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                id="reset-library-btn"
                variant="destructive"
                className="sm:w-auto rounded-full"
              >
                Reset Library
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Library</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to reset your library?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Warning: This action cannot be undone.</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-600 dark:text-red-400">
                    <li>All cursors you created and added to the Library will be deleted.</li>
                    <li>Your library will be reset back to default cursors only.</li>
                  </ul>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleResetLibrary}
                >
                  Reset Library
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </section>
  );
}
