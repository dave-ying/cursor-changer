// Comprehensive diagnostic script for React + Tauri debugging

import { logger } from '../utils/logger';

const diagnosticsEnabled = import.meta.env['VITE_ENABLE_DIAGNOSTICS'] === 'true';
let componentMountCount = 0;

if (diagnosticsEnabled) {
  logger.info('[DIAGNOSTIC] Starting comprehensive debug analysis...');

  // 1. Check for React strict mode double-rendering
  const originalLoggerDebug = logger.debug;
  logger.debug = (...args: any[]) => {
    if (args[0]?.includes?.('[Titlebar] Component mounted')) {
      componentMountCount++;
      originalLoggerDebug(`[DIAGNOSTIC-TITLEBAR-MOUNT] Count: ${componentMountCount}`, ...args);

      if (componentMountCount > 1) {
        logger.warn('[DIAGNOSTIC] React Strict Mode detected! Components are mounting twice.');
        logger.warn('[DIAGNOSTIC] This is normal in development but can cause issues with effects and intervals.');
      }
    } else {
      originalLoggerDebug(...args);
    }
  };

  // 2. Monitor React error boundaries
  const originalLoggerError = logger.error;
  logger.error = (...args: any[]) => {
    if (args[0]?.includes?.('Card') || args[0]?.includes?.('insertBefore')) {
      logger.warn('[DIAGNOSTIC-ERROR] React DOM/Component error detected:', ...args);

      // Check for common causes
      if (args[0]?.includes?.('insertBefore')) {
        logger.warn('[DIAGNOSTIC-COMMON-CAUSE] Possible causes:');
        logger.warn('  - Component unmounting while async operations ongoing');
        logger.warn('  - React Strict Mode double rendering');
        logger.warn('  - State updates after component unmount');
        logger.warn('  - Duplicate key props causing reconciliation issues');
      }

      if (args[0]?.includes?.('Card')) {
        logger.warn('[DIAGNOSTIC-COMMON-CAUSE] Card component issues:');
        logger.warn('  - Missing or invalid props');
        logger.warn('  - Duplicate keys in lists');
        logger.warn('  - Race conditions with async data loading');
        logger.warn('  - Invalid ref forwarding');
      }
    }
    originalLoggerError(...args);
  };

  // 3. Monitor SVG loading
  const originalImageLoad = Image.prototype.onload;
  Image.prototype.onload = function (this: GlobalEventHandlers, ev: Event) {
    const img = this as unknown as HTMLImageElement;
    logger.debug('[DIAGNOSTIC-SVG] Image loaded:', img.src);
    if (typeof originalImageLoad === 'function') {
      return originalImageLoad.call(this, ev);
    }
    return null;
  };

  // 4. Add resource loading monitoring
  window.addEventListener('load', () => {
    logger.debug('[DIAGNOSTIC] Page fully loaded. Checking resources...');

    // Check SVG elements
    const svgElements = document.querySelectorAll('svg');
    logger.debug(`[DIAGNOSTIC] Found ${svgElements.length} SVG elements`);

    if (svgElements.length === 0) {
      logger.warn('[DIAGNOSTIC-WARNING] No SVG elements found - this might be the source of "SVG count: 0"');
    }

    // Check for duplicate DOM elements
    const allElements = document.querySelectorAll('[data-testid], [class*="titlebar"], [class*="card"]');
    logger.debug(`[DIAGNOSTIC] Found ${allElements.length} potentially problematic elements`);

    // Monitor for DOM mutations that might cause React issues
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              if (element.querySelector?.('svg') || element.tagName === 'svg') {
                logger.debug('[DIAGNOSTIC-MUTATION] SVG element added to DOM:', element.outerHTML?.substring(0, 100));
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    logger.info('[DIAGNOSTIC] Comprehensive monitoring enabled');
    logger.info('[DIAGNOSTIC] Expected issues to monitor:');
    logger.info('  1. Double Titlebar mounting (React Strict Mode)');
    logger.info('  2. Card component render errors');
    logger.info('  3. SVG resource loading failures');
    logger.info('  4. DOM insertion conflicts during updates');
  });
}

export default {
  componentMountCount,
  diagnosticsEnabled
};