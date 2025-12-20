/**
 * Animation constants and utilities for the cursor library pulsing feature
 */

import { logger } from '../utils/logger';

// CSS custom property names for the pulsing animation
export const ANIMATION_CSS_PROPERTIES = {
  SCALE: '--library-pulse-scale',
  DURATION: '--library-pulse-duration',
  DELAY: '--pulse-delay',
  EASING: '--library-pulse-easing',
  ITERATIONS: '--library-pulse-iterations'
} as const;

// Default animation configuration
export const ANIMATION_DEFAULTS = {
  SCALE: 1.05, // 5% scale increase at pulse peak
  DURATION: '1.5s', // Duration of a single pulse loop
  STAGGER_INTERVAL: 0.2, // Seconds between each item's pulse start
  EASING: 'linear', // Linear timing for uniform speed throughout animation
  ITERATIONS: 'infinite', // Number of animation iterations
  FILL_MODE: 'both' // How to apply styles before and after animation
} as const;

// Animation timing presets for different effects
export const ANIMATION_PRESETS = {
  SUBTLE: {
    scale: 1.02,
    duration: '3s',
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  },
  MODERATE: {
    scale: 1.05,
    duration: '1.5s',
    easing: 'linear'
  },
  PRONOUNCED: {
    scale: 1.08,
    duration: '2s',
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
} as const;

// Animation class names and selectors
export const ANIMATION_SELECTORS = {
  MAIN_CONTENT: '#main-content',
  LIBRARY_SECTION: '#library-section',
  LIBRARY_ITEM: '.library-item',
  CURSOR_PREVIEW: '.cursor-preview',
  ACTIVE_CLASS: 'cursor-selection-active',
  SELECTING_CLASS: 'selecting-from-library',
  HOVER_CLASS: 'hover',
  SELECTED_CLASS: 'selected-library-item',
  HIGHLIGHTED_CLASS: 'active-highlighted'
} as const;

// Media query for reduced motion preference
export const REDUCED_MOTION_MEDIA_QUERY = '(prefers-reduced-motion: reduce)' as const;

/**
 * Calculate staggered animation delay for a library item
 * @param index - The index of the item in the library array
 * @param staggerInterval - The time interval between each item's pulse (default: 0.2s)
 * @returns CSS time string for animation delay
 */
export function calculateStaggerDelay(
  index: number, 
  staggerInterval: number = ANIMATION_DEFAULTS.STAGGER_INTERVAL
): string {
  return `${index * staggerInterval}s`;
}

/**
 * Check if reduced motion is preferred
 * @returns boolean indicating if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches;
  }
  return false;
}

/**
 * Generate complete CSS selector for library items in selection mode
 * @returns CSS selector string
 */
export function getLibrarySelectionModeSelector(): string {
  return [
    ANIMATION_SELECTORS.MAIN_CONTENT,
    `${ANIMATION_SELECTORS.MAIN_CONTENT}.${ANIMATION_SELECTORS.ACTIVE_CLASS}.${ANIMATION_SELECTORS.SELECTING_CLASS}`,
    ANIMATION_SELECTORS.LIBRARY_SECTION,
    `${ANIMATION_SELECTORS.LIBRARY_SECTION} ${ANIMATION_SELECTORS.LIBRARY_ITEM} ${ANIMATION_SELECTORS.CURSOR_PREVIEW}`
  ].join(' ');
}

/**
 * Generate CSS selector for paused animation states (hover, selected, highlighted)
 * @returns CSS selector string
 */
export function getPausedAnimationSelector(): string {
  const base = [
    ANIMATION_SELECTORS.MAIN_CONTENT,
    `${ANIMATION_SELECTORS.MAIN_CONTENT}.${ANIMATION_SELECTORS.ACTIVE_CLASS}.${ANIMATION_SELECTORS.SELECTING_CLASS}`,
    ANIMATION_SELECTORS.LIBRARY_SECTION
  ].join(' ');

  const states = [
    `${ANIMATION_SELECTORS.LIBRARY_ITEM}:${ANIMATION_SELECTORS.HOVER_CLASS}`,
    `${ANIMATION_SELECTORS.LIBRARY_ITEM}.${ANIMATION_SELECTORS.SELECTED_CLASS}`,
    `${ANIMATION_SELECTORS.LIBRARY_ITEM}.${ANIMATION_SELECTORS.HIGHLIGHTED_CLASS}`
  ].map(state => `${base} ${state} ${ANIMATION_SELECTORS.CURSOR_PREVIEW}`);

  return states.join(',\n');
}

/**
 * Animation preset types
 */
export type AnimationPreset = keyof typeof ANIMATION_PRESETS;

/**
 * Get animation configuration based on preset
 * @param preset - Animation preset to use
 * @returns Complete animation configuration
 */
export function getAnimationConfig(preset: AnimationPreset = 'MODERATE') {
  const presetConfig = ANIMATION_PRESETS[preset];
  return {
    ...ANIMATION_DEFAULTS,
    ...presetConfig,
    staggerInterval: ANIMATION_DEFAULTS.STAGGER_INTERVAL
  };
}

/**
 * Calculate dynamic stagger delay with bounds checking
 * @param index - The index of the item in the library array
 * @param staggerInterval - The time interval between each item's pulse
 * @param maxDelay - Maximum delay to prevent excessive staggering
 * @returns CSS time string for animation delay
 */
export function calculateStaggerDelayBounded(
  index: number, 
  staggerInterval: number = ANIMATION_DEFAULTS.STAGGER_INTERVAL,
  maxDelay: number = 2.0 // Cap at 2 seconds to avoid excessive delays
): string {
  const delay = Math.min(index * staggerInterval, maxDelay);
  return `${delay}s`;
}

/**
 * Validate animation configuration
 * @param config - Animation configuration to validate
 * @returns boolean indicating if configuration is valid
 */
export function validateAnimationConfig(config: Partial<typeof ANIMATION_DEFAULTS>): boolean {
  const { SCALE, DURATION, STAGGER_INTERVAL } = config;
  
  // Validate scale (should be between 1.0 and 1.2 for reasonable visual effects)
  if (SCALE !== undefined && (SCALE < 1.0 || SCALE > 1.2)) {
    logger.warn(`Animation scale ${SCALE} is outside recommended range (1.0 - 1.2)`);
    return false;
  }
  
  // Validate duration (should be between 1s and 5s for smooth animation)
  if (DURATION && !/^\d+(\.\d+)?s$/.test(DURATION)) {
    logger.warn(`Animation duration ${DURATION} is not a valid CSS time value`);
    return false;
  }
  
  // Validate stagger interval (should be reasonable for UX)
  if (STAGGER_INTERVAL !== undefined && (STAGGER_INTERVAL < 0.1 || STAGGER_INTERVAL > 0.5)) {
    logger.warn(`Stagger interval ${STAGGER_INTERVAL}s is outside recommended range (0.1 - 0.5s)`);
    return false;
  }
  
  return true;
}

/**
 * Generate complete CSS animation declaration
 * @param config - Animation configuration
 * @param _delay - Animation delay ( stagger )
 * @returns Complete CSS animation string
 */
export function generateAnimationCSS(config: typeof ANIMATION_DEFAULTS, _delay: string): string {
  const { DURATION, EASING, ITERATIONS, FILL_MODE } = config;
  
  return [
    `subtle-pulse-scale`,
    DURATION,
    EASING,
    ITERATIONS,
    FILL_MODE
  ].join(' ');
}