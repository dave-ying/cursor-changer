import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useAppStore } from './store/useAppStore';
import { useGlobalRightClickHandler } from './hooks/useGlobalRightClickHandler';
import { Titlebar } from './components/Titlebar';
import { CursorCustomization } from './components/CursorCustomization/index';
import { CloseDialog } from './components/CloseDialog';
import { GlobalToastProvider } from './components/ui/GlobalToastProvider';
import { Events } from './tauri/events';
import { logger } from './utils/logger';

export default function App(): React.JSX.Element {
  const { listen, isReady } = useApp();
  const activeSection = useAppStore((s) => s.activeSection);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Use the global right-click handler
  useGlobalRightClickHandler();
  
  // Listen for close confirmation request from backend
  useEffect(() => {
    if (!isReady) return;
    
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen(Events.showCloseConfirmation, () => {
          setShowCloseDialog(true);
        });
      } catch (error) {
        logger.error('Failed to listen to show-close-confirmation:', error);
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, [listen, isReady]);

  const handleCloseClick = () => {
    // Opening close dialog
    setShowCloseDialog(true);
  };

  // Apply horizontal layout class when showing cursor customization
  const appContentClass = `app-content ${activeSection === 'cursor-customization' ? 'cursor-customization-layout' : ''}`;

  return (
    <>
      {/* Show toast provider for both settings and cursor customization */}
      {(activeSection === 'cursor-customization' || activeSection === 'settings') && <GlobalToastProvider />}
      
      <Titlebar onCloseClick={handleCloseClick} />
      <CursorCustomization className={appContentClass} />
      <CloseDialog
        isOpen={showCloseDialog}
        onClose={() => setShowCloseDialog(false)}
      />
    </>
  );
}