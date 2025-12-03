const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { ExtractionError, ErrorTypes } = require('../utils/errors');
const { normalizeWhitespace, countWords, calculateReadTime } = require('../utils/helpers');

/**
 * Selectors for elements to remove (noise/boilerplate)
 */
const REMOVE_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'embed',
  'object',
  'svg',
  'canvas',
  'nav',
  'header:not(article header)',
  'footer:not(article footer)',
  '.navigation',
  '.nav',
  '.menu',
  '.sidebar',
  '.widget',
  '.advertisement',
  '.ad',
  '.ads',
  '.banner',
  '.social-share',
  '.social-buttons',
  '.share-buttons',
  '.comments',
  '.comment-section',
  '.related-posts',
  '.recommended',
  '.newsletter',
  '.subscription',
  '.popup',
  '.modal',
  '.cookie-notice',
  '.cookie-banner',
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  '[aria-hidden="true"]',
];

/**
 * Selectors to find main article content (in priority order)
 */
const ARTICLE_SELECTORS = [
  'article',
  '[role="main"]',
  'main',
  '.article',
  '.post',
  '.post-content',
  '.article-content',
  '.entry-content',
  '.content',
  '.blog-post',
  '.story',
  '.case-study',
  '#content',
  '#main-content',
  '#article',
];

/**
 * Parse HTML and load into cheerio
 * @param {string} html - Raw HTML string
 * @returns {CheerioAPI} Cheerio instance
 */
function parseHtml(html) {
  if (!html || typeof html !== 'string') {
    throw new ExtractionError(
      ErrorTypes.PARSE_ERROR,
      'Invalid HTML content provided'
    );
  }

  try {
    return cheerio.load(html, {
      decodeEntities: true,
      normalizeWhitespace: false, // We'll handle this ourselves
    });
  } catch (error) {
    throw new ExtractionError(
      ErrorTypes.PARSE_ERROR,
      `Failed to parse HTML: ${error.message}`
    );
  }
}

/**
 * Remove noise elements from the DOM
 * @param {CheerioAPI} $ - Cheerio instance
 */
function removeNoise($) {
  REMOVE_SELECTORS.forEach(selector => {
    try {
      $(selector).remove();
    } catch {
      // Ignore invalid selectors
    }
  });
}

/**
 * Identify and extract the main article content
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {Cheerio} Main content element
 */
function identifyMainContent($) {
  // Try each selector in priority order
  for (const selector of ARTICLE_SELECTORS) {
    const element = $(selector).first();
    if (element.length && element.text().trim().length > 200) {
      logger.debug(`Found main content using selector: ${selector}`);
      return element;
    }
  }

  // Fallback: find the element with the most paragraph content
  let bestElement = null;
  let maxTextLength = 0;

  $('div, section').each((_, el) => {
    const $el = $(el);
    const paragraphs = $el.find('p');
    const textLength = paragraphs.text().length;

    if (textLength > maxTextLength) {
      maxTextLength = textLength;
      bestElement = $el;
    }
  });

  if (bestElement && maxTextLength > 200) {
    logger.debug('Found main content using paragraph density heuristic');
    return bestElement;
  }

  // Last resort: use body
  logger.debug('Using body as main content (fallback)');
  return $('body');
}

/**
 * Extract headings hierarchy from content
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} content - Content element
 * @returns {Array} Headings array
 */
function extractHeadings($, content) {
  const headings = [];

  content.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    const level = parseInt(el.tagName.charAt(1), 10);
    const text = sanitizeText($el.text());

    if (text) {
      headings.push({ level, text });
    }
  });

  return headings;
}

/**
 * Extract blockquotes from content
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} content - Content element
 * @returns {Array} Quotes array
 */
function extractQuotes($, content) {
  const quotes = [];

  content.find('blockquote').each((_, el) => {
    const $el = $(el);
    const text = sanitizeText($el.text());
    const cite = $el.find('cite').text().trim() || null;

    if (text && text.length > 20) {
      quotes.push({ text, cite });
    }
  });

  return quotes;
}

/**
 * Extract metadata from HTML head and content
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {Object} Metadata object
 */
function extractMetadata($) {
  const metadata = {
    title: null,
    description: null,
    author: null,
    publishedDate: null,
    imageUrl: null,
    siteName: null,
  };

  // Title (in priority order)
  metadata.title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('title').text().trim() ||
    $('h1').first().text().trim();

  // Description
  metadata.description =
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content');

  // Author
  metadata.author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('[rel="author"]').first().text().trim() ||
    $('.author').first().text().trim() ||
    $('[class*="author"]').first().text().trim();

  // Published date
  metadata.publishedDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    $('meta[name="date"]').attr('content');

  // Image
  metadata.imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');

  // Site name
  metadata.siteName =
    $('meta[property="og:site_name"]').attr('content');

  // Clean up null/empty values
  Object.keys(metadata).forEach(key => {
    if (metadata[key]) {
      metadata[key] = sanitizeText(metadata[key]);
    }
  });

  return metadata;
}

/**
 * Sanitize and clean text content
 * @param {string} text - Raw text
 * @returns {string} Cleaned text
 */
function sanitizeText(text) {
  if (!text) return '';

  return text
    // Remove HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    // Remove control characters
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert content element to structured HTML
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} content - Content element
 * @returns {string} Cleaned HTML
 */
function contentToHtml($, content) {
  // Clone to avoid modifying original
  const clone = content.clone();

  // Clean up attributes we don't need
  clone.find('*').each((_, el) => {
    const $el = $(el);
    const allowedAttrs = ['href', 'src', 'alt', 'title'];
    const attrs = Object.keys(el.attribs || {});

    attrs.forEach(attr => {
      if (!allowedAttrs.includes(attr)) {
        $el.removeAttr(attr);
      }
    });
  });

  return clone.html();
}

/**
 * Convert content element to plain text
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} content - Content element
 * @returns {string} Plain text
 */
function contentToText($, content) {
  // Clone to avoid modifying original
  const clone = content.clone();

  // Add spacing after block elements
  clone.find('p, h1, h2, h3, h4, h5, h6, li, br').each((_, el) => {
    $(el).append('\n');
  });

  clone.find('div, section, article').each((_, el) => {
    $(el).append('\n\n');
  });

  const text = clone.text();
  return normalizeWhitespace(text);
}

/**
 * Main parsing function - orchestrates the full parsing process
 * @param {string} html - Raw HTML content
 * @returns {Object} Parsed content object
 */
function parse(html) {
  logger.debug('Starting HTML parsing');

  const $ = parseHtml(html);

  // Remove noise first
  removeNoise($);

  // Extract metadata
  const metadata = extractMetadata($);

  // Find main content
  const mainContent = identifyMainContent($);

  // Extract structured data
  const headings = extractHeadings($, mainContent);
  const quotes = extractQuotes($, mainContent);

  // Convert to different formats
  const htmlStructured = contentToHtml($, mainContent);
  const textOnly = contentToText($, mainContent);

  // Calculate stats
  const wordCount = countWords(textOnly);
  const estimatedReadTime = calculateReadTime(wordCount);

  const result = {
    title: metadata.title || headings[0]?.text || 'Untitled',
    textOnly,
    htmlStructured,
    wordCount,
    estimatedReadTime,
    metadata,
    headings,
    quotes,
  };

  logger.debug(`Parsed content: ${wordCount} words, ${headings.length} headings, ${quotes.length} quotes`);

  return result;
}

module.exports = {
  parseHtml,
  parse,
  removeNoise,
  identifyMainContent,
  extractHeadings,
  extractQuotes,
  extractMetadata,
  sanitizeText,
  contentToHtml,
  contentToText,
};
