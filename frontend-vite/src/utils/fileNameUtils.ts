/**
 * Utility functions for filename sanitization to ensure Windows compatibility
 */

/**
 * Characters that are not allowed in Windows filenames
 */
export const INVALID_FILENAME_CHARS = /[<>:"/\\|?*]/g;

/**
 * Reserved Windows filenames that cannot be used
 */
export const RESERVED_FILENAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
];

/**
 * Sanitizes a filename by removing invalid characters and handling reserved names
 * @param filename - The filename to sanitize
 * @param replacement - Character to replace invalid characters with (default: '_')
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string, replacement: string = '_'): string {
    if (!filename || typeof filename !== 'string') {
        return 'cursor';
    }

    // Remove invalid characters
    let sanitized = filename.replace(INVALID_FILENAME_CHARS, replacement);
    
    // Remove leading spaces and dots, but allow trailing spaces
    sanitized = sanitized.replace(/^[.\s]+/g, '');
    
    // Handle empty result after sanitization
    if (!sanitized) {
        return 'cursor';
    }
    
    // Split into base + extension for reserved handling
    const lastDotIndex = sanitized.lastIndexOf('.');
    const baseName = lastDotIndex === -1 ? sanitized : sanitized.slice(0, lastDotIndex);
    const extension = lastDotIndex === -1 ? '' : sanitized.slice(lastDotIndex);

    // Check for reserved names (case-insensitive)
    const upperBaseName = baseName.toUpperCase();
    if (RESERVED_FILENAMES.includes(upperBaseName)) {
        const safeBaseName = `${upperBaseName}_cursor`;
        sanitized = `${safeBaseName}${extension}`;
    }
    
    // Limit length to reasonable Windows limit (leave room for extension)
    if (sanitized.length > 200) {
        const extension = sanitized.includes('.') ? '.' + sanitized.split('.').pop() : '';
        const nameWithoutExt = sanitized.slice(0, 200 - extension.length);
        sanitized = nameWithoutExt + extension;
    }
    
    return sanitized;
}

/**
 * Maximum allowed length for cursor names
 */
export const CURSOR_NAME_MAX_LENGTH = 55;

/**
 * Sanitizes cursor names specifically, preserving the file extension
 * @param cursorName - The cursor name to sanitize (without extension)
 * @param replacement - Character to replace invalid characters with (default: '_')
 * @returns Sanitized cursor name
 */
export function sanitizeCursorName(cursorName: string, replacement: string = '_'): string {
    if (cursorName === undefined || cursorName === null || cursorName === '') {
        return 'cursor';
    }

    const sanitized = sanitizeFilename(cursorName, replacement);
    return sanitized;
}