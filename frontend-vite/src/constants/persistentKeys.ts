const ROOT = 'cursor-changer';

export const persistentKeys = {
  activeSection: {
    showCursorNames: `${ROOT}:showCursorNames`
  },
  library: {
    previewScale: `${ROOT}:library:previewScale`
  },
  modals: {
    showSettings: `${ROOT}:modals:showSettings`,
    showClickPointPicker: `${ROOT}:modals:showClickPointPicker`,
    showActiveCursors: `${ROOT}:modals:showActiveCursors`
  }
} as const;

export type PersistentKeyGroup = keyof typeof persistentKeys;
export type PersistentKeyName<G extends PersistentKeyGroup> = keyof (typeof persistentKeys)[G];
