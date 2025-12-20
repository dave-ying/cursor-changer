// Minimal shim so Vitest can resolve the legacy '@tauri-apps/api/tauri'
// entry that the distributed bundle references. In Tauri v2 the
// replacement lives under '@tauri-apps/api/core', so forward the invoke
// helper while leaving other exports empty.
import { invoke } from '@tauri-apps/api/core';

export { invoke };

export default {
  invoke
};
