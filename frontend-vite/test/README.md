# Test Coverage & Utility Guide

## Coverage workflow
1. Run `npm run test:coverage` from the repo root (or inside `frontend-vite`). This runs Vitest with coverage enabled and then pipes the results through `scripts/coverage-summary.js`, which prints the covered/total counts for statements, functions, and branches at the end of every run. @frontend-vite/package.json#5-18 @frontend-vite/scripts/coverage-summary.js#1-27
2. Vitest now enforces `statements: 80`, `functions: 80`, `branches: 75`, and `lines: 80` via `coverage.thresholds` so regressions fail fast instead of hiding inside HTML reports. @frontend-vite/vitest.config.js#31-92

## Shared setup & mocks
- `test/setup.ts` is executed before every suite. It:
  - Installs `@testing-library/jest-dom` matchers.
  - Provides DOM shims (e.g., `ResizeObserver`, `matchMedia`) so hooks rendering media queries work in jsdom.
  - Installs a full Tauri runtime shim (multiple API surfaces), including async window/listen helpers, and keeps it reset via `afterEach`.
  - Silences known noisy console output while throwing for unexpected `console.error`.
  - Re-creates the Tauri shim after each test to prevent state leakage.
  Use this file as the canonical home for future global mocks rather than re-defining them per test. @frontend-vite/test/setup.ts#1-198

## Hook/service harnesses already available
- `useToast` tests (`test/unit/hooks/useToast.test.ts`) show how to hoist spies, override `toastService`, and drive subscriber callbacks to assert state synchronization. Copy this structure when testing other event-driven services or Zustand slices. @frontend-vite/test/unit/hooks/useToast.test.ts#1-132
- `useToastContext` tests (`test/unit/hooks/useToastContext.test.ts`) demonstrate wrapping hooks with convenient mock objects and re-exporting from `vi.mock`. @frontend-vite/test/unit/hooks/useToastContext.test.ts#1-51
- `useTauri` tests (`test/unit/hooks/useTauri.test.ts`) illustrate advanced runtime mocking: swapping out pieces of the global `__TAURI__`, toggling fake timers, and asserting fallback error states. This is the recommended template for any hook that polls or waits for global injections. @frontend-vite/test/unit/hooks/useTauri.test.ts#1-130

## Adding new utilities/mocks
1. Prefer exporting helpers from `test/` (e.g., `test/utils`, new folders under `test/unit`) instead of scattering `vi.mock` definitions. Co-locating them keeps coverage contributions discoverable.
2. Document any new helper here with a short description + file path so future contributors know it exists.
3. If a helper relies on global state, reset it in `afterEach` (follow the pattern in `test/setup.ts`).

Keeping this README up-to-date ensures everyone shares the same toolkit while we continue pushing branch/function coverage higher.
