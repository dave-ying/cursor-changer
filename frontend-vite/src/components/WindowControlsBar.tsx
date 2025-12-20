import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAppStore } from '../store/useAppStore';
import { Button } from '@/components/ui/button';
import { logger } from '../utils/logger';

interface WindowControlsBarProps {
  onCloseClick: () => void;
}

export function WindowControlsBar({ onCloseClick }: WindowControlsBarProps) {
  const { getAppWindow } = useApp();
  const updateMaximizeState = useAppStore((s) => s.operations.updateMaximizeState);
  const isMaximized = useAppStore((s) => s.isMaximized);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    // keep maximize state reasonably up-to-date for icon toggling
    updateMaximizeState();
    const id = setInterval(updateMaximizeState, 1000);
    return () => clearInterval(id);
  }, [updateMaximizeState]);

  const handleMinimize = async () => {
    try {
      const win = getAppWindow();
      await win.minimize();
    } catch (error) {
      logger.error('WindowControlsBar: minimize failed', error);
    }
  };

  const handleMaximize = async () => {
    try {
      const win = getAppWindow();
      if (isMaximized) {
        await win.unmaximize();
      } else {
        await win.maximize();
      }
      // small delay to let state update
      setTimeout(updateMaximizeState, 120);
    } catch (error) {
      logger.error('WindowControlsBar: maximize/restore failed', error);
    }
  };

  const handleClose = () => {
    // Delegate to the same confirmation flow used by the main titlebar
    if (typeof onCloseClick === 'function') {
      onCloseClick();
    }
  };

  return (
    <div className="window-controls-bar">
      <div style={{ flex: 1 }} />
      <div className="titlebar-buttons" role="group" aria-label="Window controls">
  <Button aria-label="Minimize window" className="titlebar-button minimize" onClick={handleMinimize} title="Minimize" variant="ghost" size="icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="titlebar-glyph" style={{ width: '14px', height: '14px' }}>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14" />
          </svg>
        </Button>

  <Button aria-label={isMaximized ? 'Restore window' : 'Maximize window'} className="titlebar-button maximize" onClick={handleMaximize} title={isMaximized ? 'Restore Down' : 'Maximize'} variant="ghost" size="icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="titlebar-glyph" style={{ width: '14px', height: '14px', display: isMaximized ? 'none' : 'block' }}>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="titlebar-glyph" style={{ width: '14px', height: '14px', display: isMaximized ? 'block' : 'none' }}>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
          </svg>
        </Button>

  <Button aria-label="Close window" className="titlebar-button close" onClick={handleClose} title="Close" variant="ghost" size="icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="titlebar-glyph" style={{ width: '14px', height: '14px' }}>
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>
    </div>
  );
}