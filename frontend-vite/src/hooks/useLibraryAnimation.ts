/**
 * Custom hook for managing library animation logic
 * Handles staggered animations, reduced motion preferences, and configuration
 */

import React, { useMemo } from 'react';
import { ANIMATION_DEFAULTS, calculateStaggerDelay, prefersReducedMotion as getPrefersReducedMotion } from '../constants/animationConstants';

/**
 * Animation configuration interface
 */
export interface AnimationConfig {
  pulseDelay: string;
  shouldAnimate: boolean;
  isPaused: boolean;
  animationName: string;
  animationDuration: string;
  animationTimingFunction: string;
  animationIterationCount: string;
  animationFillMode: string;
}

/**
 * Hook options interface
 */
export interface UseLibraryAnimationOptions {
  animationIndex: number;
  selectionMode: boolean;
  enablePulseAnimation?: boolean;
  staggerInterval?: number;
  isHovered?: boolean;
  isSelected?: boolean;
  isHighlighted?: boolean;
}

/**
 * Custom hook for library animation state and configuration
 */
export function useLibraryAnimation(options: UseLibraryAnimationOptions): AnimationConfig {
  const {
    animationIndex,
    selectionMode,
    enablePulseAnimation = true,
    staggerInterval = ANIMATION_DEFAULTS.STAGGER_INTERVAL,
    isHovered = false,
    isSelected = false,
    isHighlighted = false
  } = options;

  // Check if user prefers reduced motion
  const motionPreference = useMemo(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return getPrefersReducedMotion();
  }, []);

  // Calculate animation delay based on index for staggering effect
  const pulseDelay = useMemo(() => {
    if (!enablePulseAnimation || !selectionMode || motionPreference) {
      return '0s';
    }
    return calculateStaggerDelay(animationIndex, staggerInterval);
  }, [animationIndex, selectionMode, enablePulseAnimation, staggerInterval, motionPreference]);

  // Determine if animation should be enabled
  const shouldAnimate = useMemo(() => {
    return enablePulseAnimation && selectionMode && !motionPreference;
  }, [enablePulseAnimation, selectionMode, motionPreference]);

  // Determine if animation should be paused (hover, selected, or highlighted states)
  const isPaused = useMemo(() => {
    return isHovered || isSelected || isHighlighted;
  }, [isHovered, isSelected, isHighlighted]);

  // Complete animation configuration
  const animationConfig: AnimationConfig = useMemo(() => ({
    pulseDelay,
    shouldAnimate,
    isPaused,
    animationName: 'subtle-pulse-scale',
    animationDuration: ANIMATION_DEFAULTS.DURATION,
    animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    animationIterationCount: 'infinite',
    animationFillMode: 'both'
  }), [pulseDelay, shouldAnimate, isPaused]);

  return animationConfig;
}

/**
 * Hook for generating CSS custom properties for animation
 */
export function useAnimationCSSProperties(config: AnimationConfig): Record<string, string> {
  return useMemo(() => {
    const properties: Record<string, string> = {};

    if (config.shouldAnimate) {
      properties['--pulse-delay'] = config.pulseDelay;
      properties['--library-pulse-scale'] = ANIMATION_DEFAULTS.SCALE.toString();
      properties['--library-pulse-duration'] = config.animationDuration;
      properties['--library-pulse-easing'] = config.animationTimingFunction;
      properties['--library-pulse-iterations'] = config.animationIterationCount;
    }

    return properties;
  }, [config]);
}

/**
 * Hook for animation accessibility preferences
 */
export function useAnimationAccessibility() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState<boolean>(getPrefersReducedMotion());

  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      // Modern browsers
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
    return;
  }, []);

  return { prefersReducedMotion };
}