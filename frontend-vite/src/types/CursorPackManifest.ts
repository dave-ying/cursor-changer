import type { CustomizationMode } from './generated/CustomizationMode';
import type { LibraryPackItem } from './generated/LibraryPackItem';

export interface CursorPackManifest {
  version: number;
  pack_name: string;
  mode: CustomizationMode;
  created_at: string;
  items: LibraryPackItem[];
}
