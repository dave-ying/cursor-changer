const ROOT = 'cursor-changer';

export const persistentKeys = {
  activeSection: {
    showModeToggle: `${ROOT}:showModeToggle`,
    showMoreOptions: `${ROOT}:showMoreOptions`,
    showCursorNames: `${ROOT}:showCursorNames`
  },
  library: {
    showCustomizePanel: `${ROOT}:library:showCustomizePanel`,
    showMoreOptions: `${ROOT}:library:showMoreOptions`,
    previewScale: `${ROOT}:library:previewScale`
  },
  modals: {
    showSettings: `${ROOT}:modals:showSettings`,
    showClickPointPicker: `${ROOT}:modals:showClickPointPicker`
  }
} as const;

export type PersistentKeyGroup = keyof typeof persistentKeys;
export type PersistentKeyName<G extends PersistentKeyGroup> = keyof (typeof persistentKeys)[G];
