// Minimal test stub for CursorChangerStudio used by unit tests.
// This intentionally implements a small subset of the real UI class API
// so the test suite can import and exercise expected behavior.
export class CursorChangerStudio {
  constructor(opts = {}) {
    this.opts = opts;
    this.studioZoom = 1;
    this.studioPan = null;
    this.studioImg = null;
  }

  initialize() {
    // no-op initialization for tests
  }

  zoomIn() {
    this.studioZoom = (this.studioZoom || 1) * 2;
  }

  _setZoom(value) {
    this.studioZoom = value;
  }

  openForNewCursor(name, path, img) {
    // set image and reset zoom/pan to defaults as tests expect
    this.studioImg = img || null;
    this._setZoom(1);
    this.studioPan = null;
  }

  close() {
    // clear image and reset zoom
    this.studioImg = null;
    this._setZoom(1);
    const backdrop = typeof document !== 'undefined' && document.getElementById && document.getElementById('cursor-changer-studio-backdrop');
    if (backdrop && backdrop.classList) backdrop.classList.add('hidden');
  }
}

export const CursorStudio = CursorChangerStudio;
