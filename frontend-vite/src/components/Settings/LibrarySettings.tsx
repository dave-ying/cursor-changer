import React from 'react';

/**
 * Library settings have moved into the Library customize panel on the main screen.
 * Keeping an empty component preserves the tab without duplicating controls.
 */
export function LibrarySettings() {
  return (
    <section id="library-settings-section" className="mt-6">
      <h2 className="mb-3 text-base font-semibold text-foreground">Library Settings</h2>
      <p className="text-sm text-muted-foreground">
        Library controls are now available in the Library Customize panel.
      </p>
    </section>
  );
}
