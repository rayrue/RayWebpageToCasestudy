const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { ExtractionError, ErrorTypes, isRetryable, getBackoffDelay } = require('../utils/errors');
const { sleep, isValidUrl } = require('../utils/helpers');

// User agent rotation pool
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

/**
 * Get a random user agent from the pool
 */
function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/**
 * Fetch URL content with retry logic
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<{html: string, headers: Object, status: number}>}
 */
async function fetchUrl(url, options = {}) {
  const {
    timeout = config.fetchTimeout,
    maxRetries = config.maxRetries,
    userAgent = config.userAgent,
  } = options;

  // Validate URL
  if (!isValidUrl(url)) {
    throw new ExtractionError(
      ErrorTypes.INVALID_URL,
      `Invalid URL format: ${url}`,
      { url }
    );
  }

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Fetching URL (attempt ${attempt}/${maxRetries}): ${url}`);

      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': attempt === 1 ? userAgent : getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      // Check for client errors
      if (response.status >= 400) {
        throw new ExtractionError(
          ErrorTypes.EXTRACTION_FAILED,
          `HTTP ${response.status}: ${response.statusText}`,
          { url, status: response.status }
        );
      }

      // Check for rate limiting
      if (response.status === 429) {
        throw new ExtractionError(
          ErrorTypes.RATE_LIMITED,
          'Rate limited by server',
          { url, retryAfter: response.headers['retry-after'] }
        );
      }

      logger.debug(`Successfully fetched URL: ${url}`);

      return {
        html: response.data,
        headers: response.headers,
        status: response.status,
        url: response.request?.res?.responseUrl || url, // Final URL after redirects
      };
    } catch (error) {
      lastError = error;

      // Already an ExtractionError
      if (error instanceof ExtractionError) {
        if (!error.retryable || attempt === maxRetries) {
          throw error;
        }
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        lastError = new ExtractionError(
          ErrorTypes.TIMEOUT,
          `Request timed out after ${timeout}ms`,
          { url, timeout }
        );
      } else if (error.code === 'ENOTFOUND') {
        throw new ExtractionError(
          ErrorTypes.INVALID_URL,
          `Domain not found: ${url}`,
          { url }
        );
      } else if (error.response?.status === 429) {
        lastError = new ExtractionError(
          ErrorTypes.RATE_LIMITED,
          'Rate limited by server',
          { url }
        );
      } else {
        lastError = new ExtractionError(
          ErrorTypes.EXTRACTION_FAILED,
          error.message,
          { url, originalError: error.message }
        );
      }

      // Check if we should retry
      if (isRetryable(lastError) && attempt < maxRetries) {
        const delay = getBackoffDelay(attempt);
        logger.warn(`Retrying in ${delay}ms (attempt ${attempt}/${maxRetries}): ${url}`);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Extract text content from HTML while preserving structure
 * @param {string} html - Raw HTML content
 * @returns {Object} Structured text object
 */
function extractText(html) {
  // This is a basic extraction - the parsing service will do the heavy lifting
  // Here we just verify we have valid HTML content
  if (!html || typeof html !== 'string') {
    throw new ExtractionError(
      ErrorTypes.EXTRACTION_FAILED,
      'No HTML content to extract'
    );
  }

  // Check if it looks like HTML
  const hasHtmlTags = /<[^>]+>/i.test(html);
  if (!hasHtmlTags) {
    throw new ExtractionError(
      ErrorTypes.PARSE_ERROR,
      'Content does not appear to be valid HTML'
    );
  }

  return {
    raw: html,
    length: html.length,
    hasDoctype: html.toLowerCase().includes('<!doctype'),
  };
}

/**
 * Get metadata from HTTP headers and HTML
 * @param {Object} headers - Response headers
 * @param {string} html - HTML content
 * @returns {Object} Metadata object
 */
function getMetadataFromHeaders(headers, html) {
  const metadata = {
    contentType: headers['content-type'] || null,
    lastModified: headers['last-modified'] || null,
    etag: headers['etag'] || null,
  };

  return metadata;
}

module.exports = {
  fetchUrl,
  extractText,
  getMetadataFromHeaders,
  getRandomUserAgent,
};
