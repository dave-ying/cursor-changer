import React from 'react';
import { Settings } from '../Settings';

/**
 * SettingsModal component
 * Extracts settings modal functionality from MainLayout
 */
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl mx-4">
        <Settings
          isModal={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
}