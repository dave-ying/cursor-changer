export const TOAST_DURATIONS = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 8000,
  PERMANENT: 0
} as const;

export const TOAST_POSITIONS = {
  TOP_RIGHT: 'top-right',
  TOP_LEFT: 'top-left',
  BOTTOM_RIGHT: 'bottom-right',
  BOTTOM_LEFT: 'bottom-left'
} as const;

export const TOAST_DEFAULTS = {
  DURATION: TOAST_DURATIONS.MEDIUM,
  POSITION: TOAST_POSITIONS.BOTTOM_RIGHT,
  MAX_TOASTS: 5,
  STAGGER_DELAY: 100
} as const;

export const TOAST_ANIMATION_CLASSES = {
  TOP_ENTER: 'animate-toast-in',
  TOP_EXIT: 'animate-toast-out',
  BOTTOM_ENTER: 'animate-toast-in',
  BOTTOM_EXIT: 'animate-toast-out'
} as const;