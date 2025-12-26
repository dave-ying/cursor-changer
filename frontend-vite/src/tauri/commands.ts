import type { AniPreviewData } from '../types/generated/AniPreviewData';
import type { CursorClickPointInfo } from '../types/generated/CursorClickPointInfo';
import type { CursorInfo } from '../types/generated/CursorInfo';
import type { CursorStatePayload } from '../types/generated/CursorStatePayload';
import type { EffectsConfig } from '../types/generated/EffectsConfig';
import type { DefaultCursorStyle } from '../types/generated/DefaultCursorStyle';
import type { ThemeMode } from '../types/generated/ThemeMode';
import type { CustomizationMode } from '../types/generated/CustomizationMode';
import type { LibraryCursor } from '../types/generated/LibraryCursor';
import type { PackFilePreview } from '../types/generated/PackFilePreview';

import { Commands as GeneratedCommands } from './commands.generated';
import type { CommandName } from './commands.generated';

export const Commands = GeneratedCommands;
export type { CommandName };

export type CommandArgsMap = {
  [Commands.getStatus]: undefined;
  [Commands.toggleCursor]: undefined;
  [Commands.restoreCursor]: undefined;

  [Commands.getThemeMode]: undefined;

  [Commands.setHotkey]: { shortcut: string };
  [Commands.setHotkeyTemporarilyEnabled]: { enabled: boolean };
  [Commands.setShortcutEnabled]: { enabled: boolean };

  [Commands.setMinimizeToTray]: { enable: boolean };
  [Commands.setRunOnStartup]: { enable: boolean };
  [Commands.setCursorSize]: { size: number };
  [Commands.setDefaultCursorStyle]: { style: DefaultCursorStyle };
  [Commands.resetAllSettings]: undefined;
  [Commands.resetWindowSizeToDefault]: undefined;

  [Commands.quitApp]: undefined;

  [Commands.setAccentColor]: { color: string };
  [Commands.setThemeMode]: { theme_mode: ThemeMode };

  [Commands.switchCustomizationMode]: { mode: CustomizationMode };

  [Commands.getCustomizationMode]: undefined;

  [Commands.getAvailableCursors]: undefined;
  [Commands.getCustomCursors]: undefined;
  [Commands.getCursorImage]: { cursor_name: string };
  [Commands.resetCursorToDefault]: { cursor_name: string };
  [Commands.resetCurrentModeCursors]: undefined;

  [Commands.setCursorImage]: { cursor_name: string; image_path: string };
  [Commands.setAllCursors]: { image_path: string };
  [Commands.setAllCursorsWithSize]: { image_path: string; size: number };
  [Commands.setMultipleCursorsWithSize]: { cursor_names: string[]; image_path: string; size: number };

  [Commands.setCursorsToWindowsDefaults]: undefined;
  [Commands.loadAppDefaultCursors]: undefined;
  [Commands.deleteCustomCursor]: { cursor_name: string };
  [Commands.exportActiveCursorPack]: undefined;

  [Commands.readCursorFileAsDataUrl]: { file_path: string };

  [Commands.readCursorFileAsBytes]: { file_path: string };

  [Commands.browseCursorFile]: undefined;

  [Commands.getCursorWithClickPoint]: { file_path: string };

  [Commands.renderCursorImagePreview]: { file_path: string };

  [Commands.convertImageToCurWithClickPoint]: {
    input_path: string;
    size: number;
    click_point_x: number;
    click_point_y: number;
    scale: number;
    offset_x: number;
    offset_y: number;
  };

  [Commands.saveCursorFile]: { filename: string; data: number[] };
  [Commands.saveTempCursorFile]: { filename: string; data: number[] };
  [Commands.saveCursorToAppdata]: { filename: string; data: number[] };
  [Commands.getLibraryCursorsFolder]: undefined;

  [Commands.saveEffectsConfig]: { config: EffectsConfig };
  [Commands.loadEffectsConfig]: undefined;

  [Commands.getLibraryCursors]: undefined;
  [Commands.showLibraryCursorsFolder]: undefined;
  [Commands.reorderLibraryCursors]: { order: string[] };
  [Commands.removeCursorFromLibrary]: { id: string };
  [Commands.renameCursorInLibrary]: { id: string; new_name: string };
  [Commands.setSingleCursorWithSize]: { cursor_name: string; image_path: string; size: number };

  [Commands.addCursorToLibrary]: {
    name: string;
    file_path: string;
    click_point_x: number;
    click_point_y: number;
  };
  [Commands.updateCursorInLibrary]: {
    id: string;
    name: string;
    file_path: string;
    click_point_x: number;
    click_point_y: number;
  };
  [Commands.exportLibraryCursors]: undefined;

  [Commands.startLibraryFolderWatcher]: undefined;
  [Commands.stopLibraryFolderWatcher]: undefined;
  [Commands.syncLibraryWithFolder]: undefined;

  [Commands.addUploadedImageWithClickPointToLibrary]: {
    filename: string;
    data: number[];
    size: number;
    click_point_x: number;
    click_point_y: number;
    scale: number;
    offset_x: number;
    offset_y: number;
  };
  [Commands.updateLibraryCursorClickPoint]: { id: string; click_point_x: number; click_point_y: number };

  [Commands.addUploadedCursorToLibrary]: { filename: string; data: number[] };

  [Commands.getLibraryCursorPreview]: { file_path: string; filePath?: string };
  [Commands.getSystemCursorPreview]: { cursor_name: string; cursorName?: string };
  [Commands.getAniPreviewData]: { file_path: string; filePath?: string };
  [Commands.resetLibrary]: undefined;

  [Commands.getCursorPackManifest]: { archive_path: string };
  [Commands.getCursorPackFilePreviews]: { archive_path: string };
};

export type CommandResultMap = {
  [Commands.getStatus]: CursorStatePayload;
  [Commands.toggleCursor]: CursorStatePayload;
  [Commands.restoreCursor]: CursorStatePayload;

  [Commands.getThemeMode]: ThemeMode;

  [Commands.setHotkey]: CursorStatePayload;
  [Commands.setHotkeyTemporarilyEnabled]: void;
  [Commands.setShortcutEnabled]: CursorStatePayload;

  [Commands.setMinimizeToTray]: CursorStatePayload;
  [Commands.setRunOnStartup]: CursorStatePayload;
  [Commands.setCursorSize]: CursorStatePayload;
  [Commands.setDefaultCursorStyle]: CursorStatePayload;
  [Commands.resetAllSettings]: CursorStatePayload;
  [Commands.resetWindowSizeToDefault]: void;

  [Commands.quitApp]: void;

  [Commands.setAccentColor]: CursorStatePayload;
  [Commands.setThemeMode]: CursorStatePayload;

  [Commands.switchCustomizationMode]: CustomizationMode;

  [Commands.getCustomizationMode]: CustomizationMode;

  [Commands.getAvailableCursors]: CursorInfo[];
  [Commands.getCustomCursors]: CursorInfo[];
  [Commands.getCursorImage]: string | null;
  [Commands.resetCursorToDefault]: void;
  [Commands.resetCurrentModeCursors]: CursorInfo[];

  [Commands.setCursorImage]: CursorInfo;
  [Commands.setAllCursors]: CursorInfo[];
  [Commands.setAllCursorsWithSize]: CursorInfo[];
  [Commands.setMultipleCursorsWithSize]: CursorInfo[];

  [Commands.setCursorsToWindowsDefaults]: CursorInfo[];
  [Commands.loadAppDefaultCursors]: CursorInfo[];
  [Commands.deleteCustomCursor]: void;
  [Commands.exportActiveCursorPack]: string | null;

  [Commands.readCursorFileAsDataUrl]: string;

  [Commands.readCursorFileAsBytes]: number[];

  [Commands.browseCursorFile]: string | null;

  [Commands.getCursorWithClickPoint]: CursorClickPointInfo;

  [Commands.renderCursorImagePreview]: string;

  [Commands.convertImageToCurWithClickPoint]: string;

  [Commands.saveCursorFile]: string | null;
  [Commands.saveTempCursorFile]: string;
  [Commands.saveCursorToAppdata]: string;
  [Commands.getLibraryCursorsFolder]: string;

  [Commands.saveEffectsConfig]: void;
  [Commands.loadEffectsConfig]: EffectsConfig;

  [Commands.getLibraryCursors]: LibraryCursor[];
  [Commands.showLibraryCursorsFolder]: void;
  [Commands.reorderLibraryCursors]: void;
  [Commands.removeCursorFromLibrary]: void;
  [Commands.renameCursorInLibrary]: void;
  [Commands.setSingleCursorWithSize]: CursorInfo;

  [Commands.addCursorToLibrary]: LibraryCursor;
  [Commands.updateCursorInLibrary]: LibraryCursor;
  [Commands.exportLibraryCursors]: string | null;

  [Commands.startLibraryFolderWatcher]: void;
  [Commands.stopLibraryFolderWatcher]: void;
  [Commands.syncLibraryWithFolder]: void;

  [Commands.addUploadedImageWithClickPointToLibrary]: LibraryCursor;
  [Commands.updateLibraryCursorClickPoint]: LibraryCursor;

  [Commands.addUploadedCursorToLibrary]: LibraryCursor;

  [Commands.getLibraryCursorPreview]: string;
  [Commands.getSystemCursorPreview]: string;
  [Commands.getAniPreviewData]: AniPreviewData;
  [Commands.resetLibrary]: void;
  [Commands.getCursorPackManifest]: CursorPackManifest;
  [Commands.getCursorPackFilePreviews]: PackFilePreview[];
};

type AssertAllCommandArgsMapped = CommandName extends keyof CommandArgsMap
  ? keyof CommandArgsMap extends CommandName
    ? true
    : never
  : never;

type AssertAllCommandResultsMapped = CommandName extends keyof CommandResultMap
  ? keyof CommandResultMap extends CommandName
    ? true
    : never
  : never;

export const _assertAllCommandArgsMapped: AssertAllCommandArgsMapped = true;
export const _assertAllCommandResultsMapped: AssertAllCommandResultsMapped = true;

type InvokeFn = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export async function invokeCommand<C extends CommandName>(
  invoke: InvokeFn,
  cmd: C,
  ...args: CommandArgsMap[C] extends undefined ? [] : [CommandArgsMap[C]]
): Promise<CommandResultMap[C]> {
  if (args.length === 0) {
    return (await invoke(cmd)) as CommandResultMap[C];
  }
  return (await invoke(cmd, args[0] as Record<string, unknown>)) as CommandResultMap[C];
}
