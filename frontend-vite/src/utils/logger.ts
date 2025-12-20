const isDev = import.meta.env.DEV;

/**
 * Logging utility with environment-aware log levels
 * Debug logs are only enabled in development mode
 */
export const logger = {
    /**
     * Debug logs - only visible in development
     * Use for verbose debugging information
     */
    debug: (...args: any[]) => {
        if (isDev) {
            console.log('[DEBUG]', ...args);
        }
    },

    /**
     * Info logs - visible in all environments
     * Use for general informational messages
     */
    info: (...args: any[]) => {
        console.info('[INFO]', ...args);
    },

    /**
     * Warning logs - visible in all environments
     * Use for recoverable error conditions
     */
    warn: (...args: any[]) => {
        console.warn('[WARN]', ...args);
    },

    /**
     * Error logs - visible in all environments
     * Use for error conditions that need attention
     */
    error: (...args: any[]) => {
        console.error('[ERROR]', ...args);
    },
};
