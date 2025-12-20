import React from 'react';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

interface ModalButtonGroupProps {
    activeTab: 'hotspot' | 'resize';
    setActiveTab: (tab: 'hotspot' | 'resize') => void;
    accentColor?: string;
    showResizeTab?: boolean;
}

export function ModalButtonGroup({
    activeTab,
    setActiveTab,
    accentColor = '#7c3aed',
    showResizeTab = true
}: ModalButtonGroupProps) {
    return (
        <div className="flex justify-center">
        <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(value) => {
                // Only change tab if the value is different and not empty
                if (value && value !== activeTab) {
                    setActiveTab(value as 'hotspot' | 'resize');
                }
            }}
            className="bg-[#1a1a1d] rounded-full p-1"
            aria-label="Modal Button Group"
        >
                <ToggleGroupItem
                    value="hotspot"
                    className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground data-[state=off]:bg-[#1a1a1d]"
                    style={activeTab === 'hotspot' ? {
                        backgroundColor: accentColor,
                        borderColor: accentColor
                    } : {
                        backgroundColor: '#1a1a1d'
                    }}
                    aria-label="Click Point"
                >
                    🎯 Click Point
                </ToggleGroupItem>
                {showResizeTab && (
                    <ToggleGroupItem
                        value="resize"
                        className="rounded-full px-4 py-1 data-[state=on]:text-primary-foreground data-[state=off]:bg-[#1a1a1d]"
                        style={activeTab === 'resize' ? {
                            backgroundColor: accentColor,
                            borderColor: accentColor
                        } : {
                            backgroundColor: '#1a1a1d'
                        }}
                        aria-label="Resize & Reposition"
                    >
                        📐 Resize & Reposition
                    </ToggleGroupItem>
                )}
            </ToggleGroup>
        </div>
    );
}