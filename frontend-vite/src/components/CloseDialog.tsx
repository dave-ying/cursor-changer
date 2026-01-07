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
      <AlertDialogContent aria-describedby="close-dialog-text">
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to close this app?</AlertDialogTitle>
          <AlertDialogDescription id="close-dialog-text">
            Your cursors will go back to default if you close this app! If you want to continue with your custom cursors, click on Minimize instead.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction id="confirm-close" onClick={handleClose} variant="destructive" className="transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]">Close</AlertDialogAction>
          <AlertDialogAction id="confirm-minimize" onClick={handleMinimize} variant="default" className="transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]">Minimize</AlertDialogAction>
          <AlertDialogCancel id="cancel-close" onClick={handleCancel} className="transition-all duration-250 ease-out will-change-transform hover:-translate-y-[3px] hover:scale-[1.01] active:translate-y-0 active:scale-[0.99]">Cancel</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}