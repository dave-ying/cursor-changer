import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { ColorPickerPopover } from './ColorPickerPopover';

interface PresetColor {
  name: string;
  value: string;
}

const PRESET_COLORS: PresetColor[] = [
  // Red
  { name: 'Red', value: '#fa243c' },           // RGB 250,36,60

  // Orange spectrum
  { name: 'Bright Orange', value: '#fe5f14' }, // RGB 254,95,20

  // Green spectrum
  { name: 'Green', value: '#03aa49' },         // RGB 3,170,73

  // Blue spectrum
  { name: 'Bright Blue', value: '#0052ff' },   // RGB 0,82,255

  // Purple spectrum
  { name: 'Default Purple', value: '#7c3aed' }, // RGB 124,58,237 (default accent)

  // Magenta/Pink spectrum
  { name: 'Purple', value: '#db34f2' },        // RGB 219,52,242

  // Brown (neutral)
  { name: 'Brown', value: '#b78a66' },         // RGB 183,138,102
];

interface ColorChangeOptions {
  commit: boolean;
}

interface ColorPickerProps {
  value: string;
  onChange?: (color: string, options: ColorChangeOptions) => void;
}

/**
 * ColorPicker
 * - Uses shared ColorPickerPopover for the color wheel UI.
 * - Displays preset color swatches and a custom color picker button.
 * - Intermediate changes (during drag) call onChange with { commit: false }
 *   so the UI preview updates without invoking heavy backend calls or toasts.
 * - Final commit (pointer up / input blur / enter / preset click) calls
 *   onChange with { commit: true } to persist the color and show the toast.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  // Track the custom color separately so it persists even when a preset is selected
  const [customColor, setCustomColor] = useState<string | null>(() => {
    // Initialize with current value if it's not a preset color
    if (value && !PRESET_COLORS.some(c => c.value === value)) {
      return value;
    }
    return null;
  });

  // Update custom color when value changes to a non-preset color
  useEffect(() => {
    if (value && !PRESET_COLORS.some(c => c.value === value)) {
      setCustomColor(value);
    }
  }, [value]);

  const handlePresetClick = (color: string) => {
    if (typeof onChange === 'function') onChange(color, { commit: true });
    setIsOpen(false);
  };

  const togglePicker = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="space-y-3 relative">
      <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => handlePresetClick(color.value)}
            className="group relative w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-background cursor-pointer"
            style={{
              backgroundColor: color.value,
              boxShadow: value === color.value ? '0 0 0 1.5px rgba(255, 255, 255, 0.5)' : 'none'
            }}
            title={color.name}
            aria-label={`Select ${color.name} color`}
          >
            {value === color.value && (
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[8px] sm:text-[10px]">
                ✓
              </span>
            )}
          </button>
        ))}
        {/* Custom color option - shows the custom color swatch (persists once set) */}
        {customColor && (
          <button
            key="custom-color"
            onClick={() => {
              if (typeof onChange === 'function') onChange(customColor, { commit: true });
            }}
            className="group relative w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-background cursor-pointer"
            style={{
              backgroundColor: customColor,
              boxShadow: value === customColor ? '0 0 0 1.5px rgba(255, 255, 255, 0.5)' : 'none'
            }}
            title="Custom color"
            aria-label="Custom color"
          >
            {value === customColor && (
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[8px] sm:text-[10px]">
                ✓
              </span>
            )}
          </button>
        )}

        {/* Custom Color Picker Button */}
        <div id="color-wheel-button" className="relative flex items-center justify-center" ref={triggerRef}>
          <button
            onClick={togglePicker}
            className="group relative w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-background overflow-hidden cursor-pointer"
            title="Choose custom color"
            aria-label="Choose custom color"
          >
            <img
              src="/color-wheel.svg"
              alt="Custom color picker"
              aria-hidden="true"
              className="w-full h-full object-cover block"
              style={{ pointerEvents: 'none' }}
            />
          </button>

          <ColorPickerPopover
            value={value || '#808080'}
            onChange={(color, options) => {
              if (typeof onChange === 'function') onChange(color, options ?? { commit: false });
            }}
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            triggerRef={triggerRef}
          />
        </div>
      </div>
    </div>
  );
}
