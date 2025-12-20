import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ColorPicker } from '@/components/ui/ColorPicker';

export function InterfaceSettings() {
  const cursorState = useAppStore((s) => s.cursorState);
  const setThemeMode = useAppStore((s) => s.operations.setThemeMode);
  const setAccentColor = useAppStore((s) => s.operations.setAccentColor);

  const currentMode = cursorState.themeMode === 'light' || cursorState.themeMode === 'dark'
    ? cursorState.themeMode
    : 'dark';

  return (
    <section id="interface-settings-section">
      <h2 className="mb-3 text-base font-semibold text-foreground">Interface Settings</h2>
      <Card className="p-4 sm:p-5 bg-muted/30 border-muted-foreground/20">
        <div className="flex items-center justify-between gap-3">
          <strong className="text-base">Theme Mode</strong>
          <ToggleGroup
            type="single"
            value={currentMode}
            onValueChange={(val) => {
              if (!val || val === currentMode) {
                return;
              }
              setThemeMode(val);
            }}
            className="bg-muted rounded-full p-1"
            aria-label="Theme Mode"
          >
            <ToggleGroupItem
              value="light"
              className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground"
              style={currentMode === 'light' ? {
                backgroundColor: cursorState.accentColor || '#7c3aed',
                borderColor: cursorState.accentColor || '#7c3aed'
              } : {}}
            >
              Light
            </ToggleGroupItem>
            <ToggleGroupItem
              value="dark"
              className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground"
              style={currentMode === 'dark' ? {
                backgroundColor: cursorState.accentColor || '#7c3aed',
                borderColor: cursorState.accentColor || '#7c3aed'
              } : {}}
            >
              Dark
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Separator className="my-4" />

        <div className="flex items-center justify-between gap-3">
          <strong className="text-base">Accent Color</strong>
          <ColorPicker
            value={cursorState.accentColor || '#7c3aed'}
            onChange={setAccentColor}
          />
        </div>
      </Card>
    </section>
  );
}
