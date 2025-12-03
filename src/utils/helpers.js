const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique story ID
 */
function generateStoryId() {
  const uuid = uuidv4().replace(/-/g, '');
  return `story_${uuid.substring(0, 12)}`;
}

/**
 * Generate a unique batch ID
 */
function generateBatchId() {
  const uuid = uuidv4().replace(/-/g, '');
  return `batch_${uuid.substring(0, 12)}`;
}

/**
 * Validate URL format
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Calculate estimated read time based on word count
 * Average reading speed: 200-250 words per minute
 */
function calculateReadTime(wordCount) {
  const wordsPerMinute = 225;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Count words in text
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Normalize whitespace in text
 */
function normalizeWhitespace(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract domain from URL
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Format date to ISO string
 */
function formatDate(date = new Date()) {
  return date.toISOString();
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100);
}

module.exports = {
  generateStoryId,
  generateBatchId,
  isValidUrl,
  calculateReadTime,
  countWords,
  normalizeWhitespace,
  extractDomain,
  formatDate,
  sleep,
  truncateText,
  sanitizeFilename,
};
