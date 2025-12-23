import { sanitizeCursorName, INVALID_FILENAME_CHARS, RESERVED_FILENAMES } from './fileNameUtils';

describe('fileNameUtils', () => {
  describe('sanitizeCursorName', () => {
    it('should remove invalid Windows filename characters', () => {
      expect(sanitizeCursorName('test<file')).toBe('test_file');
      expect(sanitizeCursorName('test>file')).toBe('test_file');
      expect(sanitizeCursorName('test:file')).toBe('test_file');
      expect(sanitizeCursorName('test"file')).toBe('test_file');
      expect(sanitizeCursorName('test/file')).toBe('test_file');
      expect(sanitizeCursorName('test\\file')).toBe('test_file');
      expect(sanitizeCursorName('test|file')).toBe('test_file');
      expect(sanitizeCursorName('test?file')).toBe('test_file');
      expect(sanitizeCursorName('test*file')).toBe('test_file');
    });

    it('should handle reserved filenames', () => {
      expect(sanitizeCursorName('CON')).toBe('CON_cursor');
      expect(sanitizeCursorName('con')).toBe('CON_cursor');
      expect(sanitizeCursorName('CON.txt')).toBe('CON_cursor.txt');
      expect(sanitizeCursorName('com1')).toBe('COM1_cursor');
      expect(sanitizeCursorName('LPT1')).toBe('LPT1_cursor');
    });

    it('should trim leading spaces and dots but preserve trailing spaces', () => {
      expect(sanitizeCursorName('  test  ')).toBe('test  ');
      expect(sanitizeCursorName('...test...')).toBe('test...');
      expect(sanitizeCursorName(' .test. ')).toBe('test. ');
      expect(sanitizeCursorName('test  ')).toBe('test  ');
      expect(sanitizeCursorName('  test')).toBe('test');
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizeCursorName('')).toBe('cursor');
      expect(sanitizeCursorName('   ')).toBe('cursor');
      expect(sanitizeCursorName('...')).toBe('cursor');
      expect(sanitizeCursorName(null as any)).toBe('cursor');
      expect(sanitizeCursorName(undefined as any)).toBe('cursor');
    });

    it('should preserve valid characters', () => {
      expect(sanitizeCursorName('my_custom_cursor')).toBe('my_custom_cursor');
      expect(sanitizeCursorName('Cursor123')).toBe('Cursor123');
      expect(sanitizeCursorName('test-file')).toBe('test-file');
      expect(sanitizeCursorName('file with spaces')).toBe('file with spaces');
    });

    it('should limit length to reasonable Windows limits', () => {
      const longName = 'a'.repeat(250) + '.cur';
      const result = sanitizeCursorName(longName);
      expect(result.length).toBeLessThanOrEqual(200);
      expect(result.endsWith('.cur')).toBe(true);
    });
  });

  describe('INVALID_FILENAME_CHARS', () => {
    it('should contain all Windows invalid characters', () => {
      const expectedChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
      expectedChars.forEach(char => {
        expect(INVALID_FILENAME_CHARS.source).toContain(char);
      });
    });
  });

  describe('RESERVED_FILENAMES', () => {
    it('should include all Windows reserved names', () => {
      const expected = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
      expected.forEach(name => {
        expect(RESERVED_FILENAMES).toContain(name);
      });
    });
  });
});