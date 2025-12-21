import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '../../utils/logger';

/**
 * Navigation component - handles view switching between cursors and settings
 * Extracted from MainLayout for better separation of concerns
 */
interface NavigationProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export function Navigation({ currentView, setCurrentView }: NavigationProps) {
  const navItems = [
    {
      id: 'cursors',
      label: 'Cursor',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="!w-5 !h-5"
        >
          <path d="M12.586 12.586 19 19" />
          <path d="M3.688 3.037a.497.497 0 0 0-.651.651l6.5 15.999a.501.501 0 0 0 .947-.062l1.569-6.083a2 2 0 0 1 1.448-1.479l6.124-1.579a.5.5 0 0 0 .063-.947z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="!w-5 !h-5"
        >
          <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    },
    {
      id: 'info',
      label: 'About',
      icon: <Info className="!w-5 !h-5" />
    }
  ];

  return (
    <nav id="toolbar" className="cursor-sidebar" aria-label="Cursor Customization">
      <div className="cursor-sidebar-nav">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? 'default' : 'ghost'}
            aria-label={item.label}
            title={item.label}
            className="cursor-sidebar-button"
            onClick={() => {
              try {
                setCurrentView(item.id);
              } catch (error) {
                logger.warn(`[Navigation] Error changing view to ${item.id}:`, error);
              }
            }}
          >
            <span className="cursor-sidebar-icon">{item.icon}</span>
            <span className="cursor-sidebar-text">{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  );
}