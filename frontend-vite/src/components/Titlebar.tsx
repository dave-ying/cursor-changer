import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAppStore } from '../store/useAppStore';
import { Button } from '@/components/ui/button';
import { logger } from '../utils/logger';

interface TitlebarProps {
  onCloseClick?: () => void;
}

interface SvgIconProps {
  className?: string;
  style?: React.CSSProperties;
}

// SVG components with error handling and fallbacks
const MinimizeIcon = ({ className, style }: SvgIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className={className}
    style={style}
    onError={(e: React.SyntheticEvent<SVGSVGElement>) => {
      logger.warn('[Titlebar] Minimize icon failed to load, using fallback');
      e.currentTarget.innerHTML = '<path d="M5 12h14" />';
    }}
  >
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 12h14" />
  </svg>
);

const MaximizeIcon = ({ className, style }: SvgIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className={className}
    style={style}
    onError={(e: React.SyntheticEvent<SVGSVGElement>) => {
      logger.warn('[Titlebar] Maximize icon failed to load, using fallback');
      e.currentTarget.innerHTML = '<rect x="5" y="5" width="14" height="14" rx="2" />';
    }}
  >
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
  </svg>
);

const RestoreIcon = ({ className, style }: SvgIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className={className}
    style={style}
    onError={(e: React.SyntheticEvent<SVGSVGElement>) => {
      logger.warn('[Titlebar] Restore icon failed to load, using fallback');
      e.currentTarget.innerHTML = '<path d="M9 9h6v6H9z" />';
    }}
  >
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m8.25-8.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-7.5A2.25 2.25 0 0 1 8.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 0 0-2.25 2.25v6" />
  </svg>
);

const CloseIcon = ({ className, style }: SvgIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    className={className}
    style={style}
    onError={(e: React.SyntheticEvent<SVGSVGElement>) => {
      logger.warn('[Titlebar] Close icon failed to load, using fallback');
      e.currentTarget.innerHTML = '<path d="M6 6l12 12M6 18L18 6" />';
    }}
  >
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export function Titlebar({ onCloseClick }: TitlebarProps) {
  const { getAppWindow } = useApp();
  const updateMaximizeState = useAppStore((s) => s.operations.updateMaximizeState);
  const isMaximized = useAppStore((s) => s.isMaximized);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    // Function to safely update maximize state
    const safeUpdateMaximizeState = () => {
      if (mounted && typeof updateMaximizeState === 'function') {
        try {
          updateMaximizeState();
        } catch (error) {
          logger.warn('[Titlebar] Error updating maximize state:', error);
        }
      }
    };

    // Update immediately on mount
    safeUpdateMaximizeState();

    // Set up periodic updates only if component is still mounted
    intervalId = setInterval(safeUpdateMaximizeState, 1000);

    // Cleanup function
    return () => {
      mounted = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [updateMaximizeState]);

  const handleMinimize = async () => {
    try {
      const win = getAppWindow();
      await win.minimize();
    } catch (error) {
      logger.error('Failed to minimize:', error);
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
      setTimeout(updateMaximizeState, 100);
    } catch (error) {
      logger.error('Failed to maximize/restore:', error);
    }
  };

  return (
    <div className="titlebar">
      <div className="titlebar-title">Cursor Changer</div>
      <div className="titlebar-buttons">
        <Button
          className="titlebar-button minimize"
          onClick={handleMinimize}
          title="Minimize"
          variant="ghost"
          size="icon"
        >
          <MinimizeIcon className="titlebar-glyph" style={{ width: '24px', height: '24px' }} />
        </Button>
        <Button
          className="titlebar-button maximize"
          onClick={handleMaximize}
          title={isMaximized ? 'Restore Down' : 'Maximize'}
          variant="ghost"
          size="icon"
        >
          {isMaximized ? (
            <RestoreIcon className="titlebar-glyph" style={{ width: '24px', height: '24px', transform: 'scaleX(-1)' }} />
          ) : (
            <MaximizeIcon className="titlebar-glyph" style={{ width: '24px', height: '24px' }} />
          )}
        </Button>
        <Button
          className="titlebar-button close"
          onClick={() => {
            if (typeof onCloseClick === 'function') {
              try {
                onCloseClick();
              } catch (error) {
                logger.error('[Titlebar] Error in onCloseClick:', error);
              }
            }
          }}
          title="Close"
          variant="ghost"
          size="icon"
        >
          <CloseIcon className="titlebar-glyph" style={{ width: '24px', height: '24px' }} />
        </Button>
      </div>
    </div>
  );
}