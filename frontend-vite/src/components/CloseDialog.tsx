import React from 'react';
import { useApp } from '../context/AppContext';
import { Commands, invokeCommand } from '../tauri/commands';
import { logger } from '../utils/logger';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface CloseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CloseDialog({ isOpen, onClose }: CloseDialogProps) {
  const { getAppWindow, invoke } = useApp();

  const handleClose = async () => {
    logger.debug('[CloseDialog] handleClose - quitting app');
    try {
      await invokeCommand(invoke, Commands.quitApp);
    } catch (error) {
      logger.error('Failed to quit app:', error);
    }
  };

  const handleMinimize = async () => {
    try {
      const win = getAppWindow();
      await win.hide();
      onClose();
    } catch (error) {
      logger.error('Failed to hide window:', error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(val) => { if (!val) onClose && onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to close this app?</AlertDialogTitle>
          <AlertDialogDescription id="close-dialog-text">
            Your cursors will go back to default if you close this app! If you want to continue with your custom cursors, click on Minimize instead.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction id="confirm-close" onClick={handleClose} variant="destructive">Close</AlertDialogAction>
          <AlertDialogAction id="confirm-minimize" onClick={handleMinimize} variant="default">Minimize</AlertDialogAction>
          <AlertDialogCancel id="cancel-close" onClick={handleCancel}>Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}