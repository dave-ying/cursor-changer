import React from 'react';
import { Settings } from '../Settings';
import { ErrorBoundary } from '@/components/ui/error-boundary';

/**
 * ContentArea component - handles the main content rendering
 * Extracted from MainLayout for better separation of concerns
 */
interface ContentAreaProps {
  currentView: string;
  children: React.ReactNode;
}

export function ContentArea({
  currentView,
  children
}: ContentAreaProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {currentView === 'settings' ? (
        <Settings isModal={false} onClose={null} />
      ) : (
        <div key="draggable-content" id="cards-area" className="flex-1 flex gap-6 min-h-0 overflow-hidden flex-col lg:flex-row">
          {children}
        </div>
      )}
    </div>
  );
}