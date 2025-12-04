const axios = require('axios');
const puppeteer = require('puppeteer-core');
const config = require('../config');
const logger = require('../utils/logger');
const { ExtractionError, ErrorTypes, isRetryable, getBackoffDelay } = require('../utils/errors');
const { sleep, isValidUrl } = require('../utils/helpers');

// Browser instance for reuse
let browserInstance = null;

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
 * Find Chrome executable path
 * Render sets PUPPETEER_EXECUTABLE_PATH or we check common locations
 */
function getChromePath() {
  // Check environment variable first (Docker sets this)
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    logger.info(`Using Chrome from env: ${process.env.PUPPETEER_EXECUTABLE_PATH}`);
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // Common Chrome/Chromium paths on Linux
  const possiblePaths = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/snap/bin/chromium',
  ];

  // On Mac (for local development)
  if (process.platform === 'darwin') {
    possiblePaths.unshift('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  }

  // Check which path exists
  const fs = require('fs');
  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      logger.info(`Found Chrome at: ${chromePath}`);
      return chromePath;
    }
  }

  logger.warn(`Chrome not found in any standard location. Tried: ${possiblePaths.join(', ')}`);
  return possiblePaths[0];
}

/**
 * Get or create browser instance
 */
async function getBrowser() {
  if (!browserInstance) {
    const chromePath = getChromePath();
    logger.info(`Launching headless browser with Chrome at: ${chromePath}`);

    try {
      browserInstance = await puppeteer.launch({
        headless: 'new',
        executablePath: chromePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions',
          '--disable-software-rasterizer',
        ],
        timeout: 30000,
      });
      logger.info('Browser launched successfully');
    } catch (launchError) {
      logger.error(`Failed to launch browser: ${launchError.message}`);
      logger.error(`Stack: ${launchError.stack}`);
      throw launchError;
    }
  }
  return browserInstance;
}

/**
 * Reset browser instance (call on errors to prevent stale references)
 */
async function resetBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {
      logger.warn(`Error closing browser: ${e.message}`);
    }
    browserInstance = null;
    logger.info('Browser instance reset');
  }
}

/**
 * Fetch URL using headless browser (for JavaScript-rendered pages)
 */
async function fetchWithBrowser(url, options = {}) {
  const { timeout = 30000 } = options;

  logger.info(`Fetching with headless browser: ${url}`);

  let browser;
  let page;

  try {
    browser = await getBrowser();
    page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(getRandomUserAgent());

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Navigate and wait for content
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait a bit more for any lazy-loaded content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the fully rendered HTML
    const html = await page.content();
    const finalUrl = page.url();

    logger.info(`Successfully fetched with browser: ${url} (${html.length} bytes)`);

    return {
      html,
      headers: {},
      status: 200,
      url: finalUrl,
    };
  } catch (error) {
    // Reset browser on any error to prevent stale instance
    logger.error(`Browser error, resetting instance: ${error.message}`);
    await resetBrowser();
    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        logger.warn(`Error closing page: ${e.message}`);
      }
    }
  }
}

/**
 * Fetch URL content with retry logic
 * Uses headless browser by default for JavaScript-rendered pages
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<{html: string, headers: Object, status: number}>}
 */
async function fetchUrl(url, options = {}) {
  const {
    timeout = config.fetchTimeout,
    maxRetries = config.maxRetries,
    useBrowser = true,  // Default to browser for JS-rendered content
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

      // Try browser first for JS content
      if (useBrowser) {
        try {
          const result = await fetchWithBrowser(url, { timeout });
          logger.info(`Browser fetch succeeded for ${url}`);
          return result;
        } catch (browserError) {
          logger.error(`Browser fetch failed for ${url}: ${browserError.message}`);
          logger.error(`Browser error stack: ${browserError.stack}`);
          logger.warn('Falling back to axios (JS content will NOT render)');
          // Fall through to axios
        }
      }

      // Fallback to axios
      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      // Check for rate limiting first (429 is also >= 400, so check it first)
      if (response.status === 429) {
        throw new ExtractionError(
          ErrorTypes.RATE_LIMITED,
          'Rate limited by server',
          { url, retryAfter: response.headers['retry-after'] }
        );
      }

      // Check for other client errors
      if (response.status >= 400) {
        throw new ExtractionError(
          ErrorTypes.EXTRACTION_FAILED,
          `HTTP ${response.status}: ${response.statusText}`,
          { url, status: response.status }
        );
      }

      logger.debug(`Successfully fetched URL: ${url}`);

      return {
        html: response.data,
        headers: response.headers,
        status: response.status,
        url: response.request?.res?.responseUrl || url,
      };
    } catch (error) {
      lastError = error;

      // Already an ExtractionError
      if (error instanceof ExtractionError) {
        if (!error.retryable || attempt === maxRetries) {
          throw error;
        }
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.name === 'TimeoutError') {
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
  if (!html || typeof html !== 'string') {
    throw new ExtractionError(
      ErrorTypes.EXTRACTION_FAILED,
      'No HTML content to extract'
    );
  }

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
 */
function getMetadataFromHeaders(headers, html) {
  return {
    contentType: headers['content-type'] || null,
    lastModified: headers['last-modified'] || null,
    etag: headers['etag'] || null,
  };
}

/**
 * Close browser instance (for cleanup)
 */
async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    logger.info('Browser instance closed');
  }
}

module.exports = {
  fetchUrl,
  fetchWithBrowser,
  extractText,
  getMetadataFromHeaders,
  getRandomUserAgent,
  closeBrowser,
  resetBrowser,
};
