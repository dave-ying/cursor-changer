/**
 * @file tauri-bootstrap.js (source copy)
 * @description Small source copy so frontend-src can be tested/edited in-repo.
 */

// Expose a promise that resolves to the resolved Tauri API objects so the
// rest of the UI can wait for availability without racing the async loader.
const TAURI = (async () => {
  const tryInjected = () => {
    try {
      const injected = (typeof window !== 'undefined') ? (window.__TAURI__ || window.__TAURI) : null;
      const internals = (typeof window !== 'undefined') ? window.__TAURI_INTERNALS__ : null;
      if (!injected) return null;
      let invokeFn = null;
      if (typeof injected.invoke === 'function') invokeFn = injected.invoke;
      else if (injected.core && typeof injected.core.invoke === 'function') invokeFn = injected.core.invoke;
      else if (injected.tauri && typeof injected.tauri.invoke === 'function') invokeFn = injected.tauri.invoke;
      else if (internals && typeof internals.invoke === 'function') invokeFn = internals.invoke.bind(internals);
      let listenFn = null;
      if (typeof injected.listen === 'function') listenFn = injected.listen;
      else if (injected.event && typeof injected.event.listen === 'function') listenFn = injected.event.listen;
      let appWindowObj = null;
      if (injected.window && typeof injected.window.getCurrentWindow === 'function') {
        try { appWindowObj = injected.window.getCurrentWindow(); } catch (e) { console.warn('[tauri-bootstrap] getCurrentWindow() failed:', e); }
      } else if (injected.window && typeof injected.window.getCurrent === 'function') {
        try { appWindowObj = injected.window.getCurrent(); } catch (e) { console.warn('[tauri-bootstrap] getCurrent() failed:', e); }
      } else {
        appWindowObj = (injected.window && injected.window.appWindow) || injected.appWindow || (injected.tauri && injected.tauri.appWindow) || null;
      }
      if (invokeFn || listenFn || appWindowObj) {
        return { invoke: invokeFn, listen: listenFn, appWindow: appWindowObj };
      }
    } catch (err) {
      console.error('[tauri-bootstrap] tryInjected() error:', err);
    }
    return null;
  };

  const injectedNow = tryInjected();
  if (injectedNow) return injectedNow;

  const waitForInjectedGlobal = async (maxMs = 5000, intervalMs = 50) => {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
      const maybe = tryInjected();
      if (maybe) return maybe;
      if (typeof window !== 'undefined' && window.__TAURI_IPC__) {
        const injected = tryInjected();
        if (injected) return injected;
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return null;
  };

  const later = await waitForInjectedGlobal();
  if (later) return later;

  return {
    invoke: async () => { throw new Error('tauri.invoke is not available. Are you running inside Tauri?'); },
    listen: async () => { throw new Error('event.listen is not available. Are you running inside Tauri?'); },
    appWindow: {
      hide: async () => { throw new Error('appWindow.hide is not available. Are you running inside Tauri?'); },
      minimize: async () => { throw new Error('appWindow.minimize is not available. Are you running inside Tauri?'); },
      listen: async () => { throw new Error('appWindow.listen is not available. Are you running inside Tauri?'); }
    }
  };
})();

export const tauriInvoke = async (...args) => {
  const t = await TAURI;
  if (typeof t.invoke !== 'function') throw new Error('tauri.invoke is not a function or not available');
  return t.invoke(...args);
};

export const tauriListen = async (...args) => {
  const t = await TAURI;
  if (typeof t.listen !== 'function') throw new Error('event.listen is not a function or not available');
  return t.listen(...args);
};

export const getAppWindow = async () => {
  const t = await TAURI;
  if (!t.appWindow) throw new Error('appWindow is not available');
  return t.appWindow;
};

export const getTauriPromise = () => TAURI;

(async () => {
  try {
    const resolved = await TAURI;
    try { console.debug('[tauri-bootstrap] TAURI resolved object', { keys: Object.keys(resolved), hasInvoke: typeof resolved.invoke, hasListen: typeof resolved.listen, hasAppWindow: !!resolved.appWindow }); } catch (e) { console.debug('[tauri-bootstrap] TAURI resolved (non-serializable) ->', resolved); }
    console.debug('[tauri-bootstrap] TAURI.invoke ->', resolved.invoke);
    console.debug('[tauri-bootstrap] TAURI.listen ->', resolved.listen);
    console.debug('[tauri-bootstrap] TAURI.appWindow ->', resolved.appWindow);
    if (typeof window !== 'undefined' && window.__TAURI__) {
      console.debug('[tauri-bootstrap] window.__TAURI__.window ->', window.__TAURI__.window);
      if (window.__TAURI__.window) {
        console.debug('[tauri-bootstrap] window.__TAURI__.window.getCurrentWindow ->', typeof window.__TAURI__.window.getCurrentWindow);
        console.debug('[tauri-bootstrap] window.__TAURI__.window.getCurrent ->', typeof window.__TAURI__.window.getCurrent);
      }
    }
    try {
      const invokeStr = resolved.invoke && resolved.invoke.toString ? resolved.invoke.toString() : '';
      const listenStr = resolved.listen && resolved.listen.toString ? resolved.listen.toString() : '';
      const isStub = /tauri\.invoke is not available/.test(invokeStr) || /event\.listen is not available/.test(listenStr);
      if (isStub) {
        const msg = document.getElementById('message');
        if (msg) { msg.textContent = 'Tauri runtime not detected. The app UI cannot operate without the backend.'; msg.className = 'error'; }
        const toggleBtn = document.getElementById('toggle-btn'); if (toggleBtn) toggleBtn.disabled = true;
        const applyBtn = document.getElementById('apply-btn'); if (applyBtn) applyBtn.disabled = true;
      }
    } catch (e) {}
  } catch (err) { console.error('[tauri-bootstrap] TAURI resolution failed', err); }
})();
