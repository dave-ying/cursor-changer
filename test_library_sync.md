# Library Live Sync Test

This document outlines the testing procedure for the enhanced Library live synchronization feature.

## Test Environment Setup

The Library now monitors two folders for live two-way synchronization:

1. **Cursors Folder**: `%APPDATA%\cursor-changer\library\cursors`
   - Monitors for `.CUR` and `.ANI` files
   - Supports instant add/remove synchronization

2. **Cursor Packs Folder**: `%APPDATA%\cursor-changer\library\cursor-packs`
   - Monitors for folders containing `.ZIP` files
   - Supports folder-level synchronization

## Test Cases

### Test Case 1: Individual Cursor File Sync

**Adding Files:**
1. Navigate to `%APPDATA%\cursor-changer\library\cursors`
2. Copy a `.CUR` or `.ANI` file into this folder
3. **Expected**: The cursor should instantly appear in the Library UI

**Deleting Files:**
1. Delete a cursor from the Library UI
2. **Expected**: The corresponding `.CUR`/`.ANI` file should be instantly deleted from the folder
3. **Alternative**: Delete a `.CUR`/`.ANI` file from the folder
4. **Expected**: The cursor should instantly disappear from the Library UI

### Test Case 2: Cursor Pack Folder Sync

**Adding Pack Folders:**
1. Create a new folder under `%APPDATA%\cursor-changer\library\cursor-packs`
2. Copy a `.ZIP` cursor pack file into this folder
3. **Expected**: The cursor pack should instantly appear in the Library UI

**Deleting Pack Folders:**
1. Delete a cursor pack from the Library UI
2. **Expected**: The containing folder should be deleted if empty, and the `.ZIP` file removed
3. **Alternative**: Delete a folder from `cursor-packs`
4. **Expected**: All cursor packs in that folder should instantly disappear from the Library UI

### Test Case 3: Rename Operations

**File Renames:**
1. Rename a `.CUR`/`.ANI` file in the cursors folder
2. **Expected**: The Library should update to reflect the new name

**Folder Renames:**
1. Rename a folder in the cursor-packs directory
2. **Expected**: All packs in that folder should be updated with new paths

## Implementation Details

### Backend Changes

1. **Enhanced Pack Deletion** (`library.rs`):
   - Now deletes the actual ZIP file when removing a pack from library
   - Removes empty containing folders to maintain clean directory structure
   - Maintains existing cache cleanup functionality

2. **Directory Watcher Enhancement** (`watcher.rs`):
   - Added directory monitoring for cursor-packs folder
   - Emits events for folder creation/deletion
   - Maintains existing file monitoring capabilities

3. **Sync Logic Enhancement** (`sync.rs`):
   - Added detection for packs in deleted directories
   - Enhanced sync to handle directory-level changes
   - Maintains existing file-based synchronization

### Frontend Changes

The frontend (`LibraryWatcherProvider.tsx`) already handles the live updates and requires no changes.

## Verification Commands

To verify the implementation is working:

1. **Check that the application builds successfully:**
   ```bash
   cd src-tauri && cargo check
   cd ../frontend-vite && npm run build
   ```

2. **Check log output for file watcher events:**
   - Look for `[FolderWatcher] File added:` messages
   - Look for `[FolderWatcher] File removed:` messages
   - Look for `[FolderWatcher] Pack folder created/removed:` messages

3. **Verify two-way sync:**
   - Add files via UI → Check file system
   - Add files via file system → Check UI
   - Delete files via UI → Check file system
   - Delete files via file system → Check UI

## Expected Behavior

- **Instant Updates**: Changes should be reflected in the UI within 200ms
- **No Conflicts**: Simultaneous operations should not cause data corruption
- **Clean Directory Structure**: Empty folders should be automatically cleaned up
- **Error Handling**: Failed operations should log warnings but not crash the application
