const {
  generateStoryId,
  generateBatchId,
  isValidUrl,
  calculateReadTime,
  countWords,
  normalizeWhitespace,
  extractDomain,
  truncateText,
  sanitizeFilename,
} = require('../../src/utils/helpers');

describe('Helpers', () => {
  describe('generateStoryId', () => {
    it('should generate a story ID with correct prefix', () => {
      const id = generateStoryId();
      expect(id).toMatch(/^story_[a-f0-9]{12}$/);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateStoryId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('generateBatchId', () => {
    it('should generate a batch ID with correct prefix', () => {
      const id = generateBatchId();
      expect(id).toMatch(/^batch_[a-f0-9]{12}$/);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid HTTP URLs', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('http://example.com/path')).toBe(true);
      expect(isValidUrl('http://example.com/path?query=1')).toBe(true);
    });

    it('should return true for valid HTTPS URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://sub.example.com/path')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('calculateReadTime', () => {
    it('should calculate read time correctly', () => {
      expect(calculateReadTime(225)).toBe('1 minute');
      expect(calculateReadTime(450)).toBe('2 minutes');
      expect(calculateReadTime(1125)).toBe('5 minutes');
    });

    it('should round up to the nearest minute', () => {
      expect(calculateReadTime(226)).toBe('2 minutes');
      expect(calculateReadTime(1)).toBe('1 minute');
    });
  });

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
      expect(countWords('   multiple   spaces   between   ')).toBe(3);
    });

    it('should handle empty or null input', () => {
      expect(countWords('')).toBe(0);
      expect(countWords(null)).toBe(0);
      expect(countWords(undefined)).toBe(0);
    });
  });

  describe('normalizeWhitespace', () => {
    it('should normalize whitespace', () => {
      expect(normalizeWhitespace('hello  world')).toBe('hello world');
      expect(normalizeWhitespace('line1\n\n\n\nline2')).toBe('line1\n\nline2');
      expect(normalizeWhitespace('  trim me  ')).toBe('trim me');
    });

    it('should handle empty input', () => {
      expect(normalizeWhitespace('')).toBe('');
      expect(normalizeWhitespace(null)).toBe('');
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('http://sub.example.com')).toBe('sub.example.com');
    });

    it('should return null for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBe(null);
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(300);
      const result = truncateText(longText, 100);
      expect(result.length).toBe(100);
      expect(result).toMatch(/\.\.\.$/);
    });

    it('should not truncate short text', () => {
      expect(truncateText('short', 100)).toBe('short');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('hello/world')).toBe('hello_world');
      expect(sanitizeFilename('file<name>test')).toBe('file_name_test');
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeFilename('a///b')).toBe('a_b');
    });
  });
});
