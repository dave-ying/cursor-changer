import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from '@/components/ui/button';

import { CursorSettings } from './Settings/CursorSettings';
import { GeneralSettings } from './Settings/GeneralSettings';
import { KeyboardShortcuts } from './Settings/KeyboardShortcuts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type SettingsTab = 'cursor' | 'general' | 'shortcuts' | 'interface';

interface SettingsProps {
  isModal?: boolean;
  onClose?: (() => void) | null;
  initialTab?: SettingsTab;
}

const DEFAULT_TAB: SettingsTab = 'cursor';

const isValidTab = (tab: string): tab is SettingsTab =>
  ['cursor', 'general', 'shortcuts', 'interface'].includes(tab as SettingsTab);

const resolveContentTab = (tab: SettingsTab): Exclude<SettingsTab, 'interface'> =>
  tab === 'interface' ? 'general' : tab;

export function Settings({ isModal = false, onClose = null, initialTab = DEFAULT_TAB }: SettingsProps): React.JSX.Element {
  const cursorState = useAppStore((s) => s.cursorState);
  const safeInitialTab = isValidTab(initialTab) ? initialTab : DEFAULT_TAB;
  const [activeTab, setActiveTab] = useState<SettingsTab>(safeInitialTab);
  const contentTab = resolveContentTab(activeTab);

  // Guard: ensure cursorState is loaded before rendering
  if (!cursorState) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  const settingsContent = (
    <div className="space-y-6">
      {contentTab === 'cursor' && <CursorSettings />}
      {contentTab === 'general' && <GeneralSettings />}
      {contentTab === 'shortcuts' && <KeyboardShortcuts />}
    </div>
  );

  if (isModal) {
    return (
      <div className="modal-backdrop" onMouseDown={onClose ? onClose : undefined} style={{ zIndex: 9999 }}>
        <div className="modal-panel flex flex-col pt-6 px-6 sm:pt-8 sm:px-8" onMouseDown={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>
            <Button onClick={onClose ? onClose : undefined} variant="ghost" size="icon" aria-label="Close settings">✕</Button>
          </div>
          {/* Top navigation for settings sections inside modal */}
          <div className="mb-4 flex justify-center">
            <ToggleGroup
              type="single"
              value={activeTab}
              onValueChange={(v) => {
                // Only change tab if the value is different and not empty
                if (v && v !== activeTab) {
                  setActiveTab(isValidTab(v) ? v : DEFAULT_TAB);
                }
              }}
              className="bg-muted rounded-full p-1"
              aria-label="Settings Sections"
            >
              <ToggleGroupItem
                value="cursor"
                className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Cursor
              </ToggleGroupItem>
              <ToggleGroupItem
                value="interface"
                className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Interface
              </ToggleGroupItem>
              <ToggleGroupItem
                value="shortcuts"
                className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Keyboard Shortcuts
              </ToggleGroupItem>
              <ToggleGroupItem
                value="general"
                className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                General
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex-1 overflow-auto pb-6">{settingsContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div id="section-settings" className="flex flex-col flex-1 min-h-0 w-full bg-card rounded-lg border text-card-foreground shadow-sm">
      <div className="px-6 pt-4 pb-3 border-b border-border/50">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize your cursor preferences and application behavior</p>

        {/* Top navigation for settings sections (Cursor | Interface | General | Keyboard Shortcuts) */}
        <div className="mt-4 flex justify-center">
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(v) => {
              // Only change tab if the value is different and not empty
              if (v && v !== activeTab) {
                setActiveTab(isValidTab(v) ? v : DEFAULT_TAB);
              }
            }}
            className="bg-muted rounded-full p-1"
            aria-label="Settings Sections"
          >
            <ToggleGroupItem
              value="cursor"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Cursor
            </ToggleGroupItem>
            <ToggleGroupItem
              value="interface"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Interface
            </ToggleGroupItem>
            <ToggleGroupItem
              value="shortcuts"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Keyboard Shortcuts
            </ToggleGroupItem>
            <ToggleGroupItem
              value="general"
              className="rounded-full px-4 py-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              General
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-6 pb-8">
        <div className="max-w-[900px] mx-auto space-y-6">
          {settingsContent}
        </div>
      </div>
    </div>
  );
}