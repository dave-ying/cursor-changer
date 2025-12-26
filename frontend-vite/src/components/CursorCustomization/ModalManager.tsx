import React from 'react';
import { HotspotPicker } from '../HotspotPicker';
import { SettingsModal } from './SettingsModal';
import { ActiveCursorsModal } from './ActiveCursorsModal';
import { PackDetailsModal } from './PackDetailsModal';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useSafeTimer } from '../../hooks/useSafeAsync';
import { MAX_CURSOR_SIZE } from '@/constants/cursorConstants';
import { logger } from '../../utils/logger';
import type { CursorInfo } from '@/types/generated/CursorInfo';
import type { LibraryCursor } from '@/types/generated/LibraryCursor';

/**
 * ModalManager component - handles all modal overlays
 * Extracted from MainLayout for better separation of concerns
 */
interface ModalManagerProps {
  showClickPointPicker: boolean;
  clickPointFile: File | null;
  clickPointFilePath: string | null;
  clickPointItemId: string | null;
  clickPointPickerKey: number;
  setShowClickPointPicker: (value: boolean) => void;
  setClickPointFile: (value: File | null) => void;
  setClickPointFilePath: (value: string | null) => void;
  setClickPointItemId: (value: string | null) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (value: boolean) => void;
  showActiveCursorsModal: boolean;
  setShowActiveCursorsModal: (value: boolean) => void;
  visibleCursors: CursorInfo[];
  customizationMode: 'simple' | 'advanced';
  loadLibraryCursors: () => void | Promise<void>;
  showPackDetailsModal: boolean;
  packDetails: LibraryCursor | null;
  packDetailsLoading?: boolean;
  isApplyingPack?: boolean;
  closePackDetailsModal: () => void;
  applyCursorPack: (pack: LibraryCursor) => void | Promise<void>;
}

export function ModalManager({
  showClickPointPicker,
  clickPointFile,
  clickPointFilePath,
  clickPointItemId,
  clickPointPickerKey,
  setShowClickPointPicker,
  setClickPointFile,
  setClickPointFilePath,
  setClickPointItemId,
  showSettingsModal,
  setShowSettingsModal,
  showActiveCursorsModal,
  setShowActiveCursorsModal,
  visibleCursors,
  customizationMode,
  loadLibraryCursors,
  showPackDetailsModal,
  packDetails,
  packDetailsLoading,
  isApplyingPack,
  closePackDetailsModal,
  applyCursorPack
}: ModalManagerProps) {
  // Create safe timer instance
  const { safeSetTimeout } = useSafeTimer();

  return (
    <>
      {/* Hotspot Picker Modal */}
      {showClickPointPicker && (clickPointFile || clickPointFilePath) && (
        <ErrorBoundary name="HotspotPicker" showDetails={false}>
          <HotspotPicker
            key={clickPointPickerKey}
            file={clickPointFile ?? undefined}
            filePath={clickPointFilePath ?? undefined}
            itemId={clickPointItemId ?? undefined}
            defaultSize={MAX_CURSOR_SIZE}
            onCancel={() => {
              try {
                setShowClickPointPicker(false);
                setClickPointFile(null);
                setClickPointFilePath(null);
                setClickPointItemId(null);
              } catch (error) {
                logger.warn('[ModalManager] Error canceling hotspot picker:', error);
              }
            }}
            onComplete={() => {
              try {
                setShowClickPointPicker(false);
                setClickPointFile(null);
                setClickPointFilePath(null);
                setClickPointItemId(null);

                // Use safe timeout to avoid dependency issues
                safeSetTimeout(() => {
                  if (typeof loadLibraryCursors === 'function') {
                    try {
                      Promise.resolve(loadLibraryCursors()).catch(e => logger.warn('[ModalManager] Failed to reload library:', e));
                    } catch (e) {
                      logger.warn('[ModalManager] Failed to reload library:', e);
                    }
                  }
                }, 0);
              } catch (error) {
                logger.warn('[ModalManager] Error completing hotspot picker:', error);
              }
            }}
          />
        </ErrorBoundary>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => {
          try {
            setShowSettingsModal(false);
          } catch (error) {
            logger.warn('[ModalManager] Error closing settings modal:', error);
          }
        }}
      />

      {/* Active Cursors Modal */}
      <ActiveCursorsModal
        isOpen={showActiveCursorsModal}
        onClose={() => {
          try {
            setShowActiveCursorsModal(false);
          } catch (error) {
            logger.warn('[ModalManager] Error closing active cursors modal:', error);
          }
        }}
        visibleCursors={visibleCursors}
        customizationMode={customizationMode}
      />

      <PackDetailsModal
        isOpen={showPackDetailsModal}
        pack={packDetails}
        loading={packDetailsLoading}
        isApplying={isApplyingPack}
        onClose={closePackDetailsModal}
        onApply={(pack) => applyCursorPack(pack)}
      />
    </>
  );
}