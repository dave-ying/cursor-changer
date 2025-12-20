/**
 * Simple Vitest setup file to provide minimal global utilities.
 */

// Provide TextEncoder/TextDecoder for Node environment
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = class TextEncoder {
    encode(str) {
      return new Uint8Array(Buffer.from(str));
    }
  };
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = class TextDecoder {
    decode(uint8) {
      return Buffer.from(uint8).toString();
    }
  };
}
