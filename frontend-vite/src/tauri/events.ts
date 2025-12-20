export const Events = {
  cursorState: 'cursor-state',
  cursorError: 'cursor-error',
  themeChanged: 'theme-changed',
  resetCursorsAfterSettings: 'reset-cursors-after-settings',
  showCloseConfirmation: 'show-close-confirmation',
  libraryFileAdded: 'library:file-added',
  libraryFileRemoved: 'library:file-removed',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

 type ListenFn = <T = unknown>(
   event: string,
   handler: (event: { payload: T }) => void
 ) => Promise<() => void>;

 export async function listenEvent<T>(
   listen: ListenFn,
   event: EventName,
   handler: (payload: T) => void | Promise<void>
 ): Promise<() => void> {
   return listen<T>(event, (e) => handler(e.payload));
 }
