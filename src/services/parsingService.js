const cheerio = require('cheerio');
const logger = require('../utils/logger');
const { ExtractionError, ErrorTypes } = require('../utils/errors');
const { normalizeWhitespace, countWords, calculateReadTime } = require('../utils/helpers');

/**
 * Selectors for elements to remove (noise/boilerplate)
 * Expanded list to catch more common patterns
 */
const REMOVE_SELECTORS = [
  // Scripts and styles
  'script',
  'style',
  'noscript',
  'iframe',
  'embed',
  'object',
  'svg',
  'canvas',
  'video',
  'audio',

  // Navigation and structure
  'nav',
  'header',
  'footer',
  'aside',

  // Common class patterns for navigation
  '.navigation',
  '.nav',
  '.navbar',
  '.menu',
  '.header',
  '.footer',
  '.sidebar',
  '.widget',
  '.breadcrumb',
  '.breadcrumbs',

  // Advertising
  '.advertisement',
  '.ad',
  '.ads',
  '.advert',
  '.banner',
  '.sponsored',

  // Social and sharing
  '.social-share',
  '.social-buttons',
  '.share-buttons',
  '.social',
  '.sharing',
  '.share',
  '[class*="social-"]',
  '[class*="share-"]',

  // Comments
  '.comments',
  '.comment-section',
  '.comment',
  '#comments',

  // Related content - THIS IS KEY
  '.related-posts',
  '.related-stories',
  '.related-articles',
  '.related-content',
  '.related',
  '.recommended',
  '.suggestions',
  '.more-stories',
  '.more-articles',
  '.also-read',
  '.you-may-like',
  '.trending',
  '.popular',
  '[class*="related-"]',
  '[class*="recommended"]',

  // Newsletter and popups
  '.newsletter',
  '.subscription',
  '.subscribe',
  '.signup',
  '.popup',
  '.modal',
  '.overlay',
  '.cookie-notice',
  '.cookie-banner',
  '.cookies',
  '.gdpr',
  '.consent',

  // Accessibility and hidden
  '[role="navigation"]',
  '[role="banner"]',
  '[role="complementary"]',
  '[role="contentinfo"]',
  '[aria-hidden="true"]',
  '.sr-only',
  '.visually-hidden',
  '.hidden',

  // Common footer patterns
  '[class*="footer"]',
  '[id*="footer"]',

  // CTA and promo sections
  '.cta',
  '.promo',
  '.promotion',
  '.call-to-action',

  // Author bio (usually separate from content)
  '.author-bio',
  '.about-author',

  // Tags and categories
  '.tags',
  '.categories',
  '.post-tags',
  '.article-tags',

  // Pagination
  '.pagination',
  '.pager',
  '.page-numbers',

  // Forms
  'form',

  // Empty links and buttons that are just UI
  'button',
  '[role="button"]',

  // Video and media elements
  '.video-wrapper',
  '.video-container',
  '.video-player',
  '.video-embed',
  '.media-wrapper',
  '.media-container',
  '[class*="video"]',
  '[class*="player"]',
  'figure video',
  'figcaption',

  // Hero and intro sections that are often just decoration
  '.hero',
  '.hero-section',
  '.intro-section',
  '.page-hero',
  '[class*="hero"]',

  // Carousel and slider elements
  '.carousel',
  '.slider',
  '.swiper',
  '[class*="carousel"]',
  '[class*="slider"]',
  '[class*="swiper"]',
];

/**
 * Selectors to find main article content (in priority order)
 */
const ARTICLE_SELECTORS = [
  // Most specific first
  'article[class*="case-study"]',
  'article[class*="customer-story"]',
  'article[class*="story"]',
  '.case-study-content',
  '.customer-story-content',
  '.story-content',

  // Standard article patterns
  'article',
  '[role="article"]',
  '[role="main"]',
  'main article',
  'main',

  // Common class patterns
  '.article-body',
  '.article-content',
  '.post-body',
  '.post-content',
  '.entry-content',
  '.story-body',
  '.content-body',
  '.main-content',
  '.page-content',

  // ID patterns
  '#article-content',
  '#main-content',
  '#content',
  '#article',

  // Generic fallbacks
  '.article',
  '.post',
  '.content',
  '.blog-post',
  '.story',
  '.case-study',
];

/**
 * Text patterns that indicate non-content sections
 */
const NOISE_TEXT_PATTERNS = [
  /^read more$/i,
  /^learn more$/i,
  /^see more$/i,
  /^view more$/i,
  /^next$/i,
  /^prev$/i,
  /^previous$/i,
  /^share$/i,
  /^tweet$/i,
  /^follow us$/i,
  /^subscribe$/i,
  /^sign up$/i,
  /^newsletter$/i,
  /^related stories?$/i,
  /^related articles?$/i,
  /^you may also like$/i,
  /^recommended$/i,
  /^trending$/i,
  /^popular$/i,
  /^cookie/i,
  /^privacy policy$/i,
  /^terms of service$/i,
  /^©/,
  /^\d{4} \w+/,  // Copyright years

  // Video and media placeholders
  /^video caption$/i,
  /^image caption$/i,
  /^caption$/i,
  /^play video$/i,
  /^watch video$/i,

  // Navigation and exploration
  /^explore here$/i,
  /^explore$/i,
  /^discover$/i,
  /^browse$/i,
  /^try claude$/i,
  /^contact sales$/i,
  /^get started$/i,
  /^sign in$/i,
  /^log in$/i,

  // Button text patterns
  /^button text$/i,
  /^click here$/i,
  /^submit$/i,

  // Generic UI elements
  /^next$/i,
  /^prev$/i,
  /^previous$/i,
  /^back$/i,
  /^close$/i,
  /^menu$/i,
  /^search$/i,

  // Form and error messages
  /^thank you!/i,
  /^oops!/i,
  /^something went wrong/i,
  /^your submission/i,
];

/**
 * Parse HTML and load into cheerio
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
      normalizeWhitespace: false,
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
 */
function removeNoise($) {
  REMOVE_SELECTORS.forEach(selector => {
    try {
      $(selector).remove();
    } catch {
      // Ignore invalid selectors
    }
  });

  // Remove elements with noise text patterns
  $('a, span, div, p').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();

    // Only remove if it's a small element (not a container with lots of content)
    if (text.length < 50) {
      for (const pattern of NOISE_TEXT_PATTERNS) {
        if (pattern.test(text)) {
          $el.remove();
          break;
        }
      }
    }
  });

  // Remove empty elements
  $('p, div, span, section').each((_, el) => {
    const $el = $(el);
    if ($el.text().trim() === '' && $el.find('img').length === 0) {
      $el.remove();
    }
  });

  // Remove images without src or with placeholder/icon patterns
  $('img').each((_, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const alt = ($el.attr('alt') || '').toLowerCase();

    // Remove icons, logos, avatars, and placeholder images
    if (
      !src ||
      src.includes('icon') ||
      src.includes('logo') ||
      src.includes('avatar') ||
      src.includes('placeholder') ||
      src.includes('1x1') ||
      src.includes('pixel') ||
      src.includes('spacer') ||
      src.includes('data:image/gif') ||
      src.includes('data:image/png;base64,iVBOR') || // tiny base64 images
      alt.includes('icon') ||
      alt.includes('logo') ||
      alt.includes('avatar')
    ) {
      $el.remove();
    }
  });
}

/**
 * Deep clean content after extraction
 */
function deepCleanContent($, content) {
  const clone = content.clone();

  // Remove any remaining noisy sections within the content
  const inContentNoiseSelectors = [
    '.related',
    '.recommended',
    '.social',
    '.share',
    '.author-bio',
    '.tags',
    '.categories',
    '[class*="related"]',
    '[class*="share"]',
    '[class*="social"]',
  ];

  inContentNoiseSelectors.forEach(selector => {
    try {
      clone.find(selector).remove();
    } catch {
      // Ignore
    }
  });

  // Remove links that are just navigation (short text, no context)
  clone.find('a').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const href = $el.attr('href') || '';

    // Remove if it's a short navigational link
    if (text.length < 30 && (
      text.toLowerCase().includes('read more') ||
      text.toLowerCase().includes('learn more') ||
      text.toLowerCase().includes('view') ||
      text.toLowerCase().includes('click here') ||
      text.toLowerCase() === 'next' ||
      text.toLowerCase() === 'prev' ||
      text.toLowerCase() === 'previous' ||
      href.includes('#') && text.length < 20
    )) {
      $el.remove();
    }
  });

  return clone;
}

/**
 * Identify and extract the main article content
 */
function identifyMainContent($) {
  // Try each selector in priority order
  for (const selector of ARTICLE_SELECTORS) {
    const element = $(selector).first();
    if (element.length) {
      const textLength = element.text().trim().length;
      const paragraphCount = element.find('p').length;

      // Must have substantial content
      if (textLength > 500 && paragraphCount >= 2) {
        logger.debug(`Found main content using selector: ${selector}`);
        return deepCleanContent($, element);
      }
    }
  }

  // Fallback: find the element with the most paragraph content
  let bestElement = null;
  let maxScore = 0;

  $('div, section, article').each((_, el) => {
    const $el = $(el);
    const paragraphs = $el.find('p');
    const paragraphCount = paragraphs.length;
    const textLength = paragraphs.text().length;

    // Score based on paragraph count and text length
    const score = (paragraphCount * 100) + textLength;

    // Must have multiple paragraphs
    if (paragraphCount >= 3 && score > maxScore) {
      maxScore = score;
      bestElement = $el;
    }
  });

  if (bestElement && maxScore > 500) {
    logger.debug('Found main content using paragraph density heuristic');
    return deepCleanContent($, bestElement);
  }

  // Last resort: use body
  logger.debug('Using body as main content (fallback)');
  return deepCleanContent($, $('body'));
}

/**
 * Extract headings hierarchy from content
 */
function extractHeadings($, content) {
  const headings = [];

  content.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const $el = $(el);
    const level = parseInt(el.tagName.charAt(1), 10);
    const text = sanitizeText($el.text());

    // Skip empty or very short headings
    if (text && text.length > 2 && !NOISE_TEXT_PATTERNS.some(p => p.test(text))) {
      headings.push({ level, text });
    }
  });

  return headings;
}

/**
 * Extract blockquotes from content
 */
function extractQuotes($, content) {
  const quotes = [];

  content.find('blockquote').each((_, el) => {
    const $el = $(el);
    const text = sanitizeText($el.text());
    const cite = $el.find('cite').text().trim() || null;

    if (text && text.length > 30) {
      quotes.push({ text, cite });
    }
  });

  return quotes;
}

/**
 * Extract metadata from HTML head and content
 */
function extractMetadata($) {
  const metadata = {
    title: null,
    description: null,
    author: null,
    publishedDate: null,
    imageUrl: null,
    siteName: null,
    companyName: null,
  };

  // Title (in priority order)
  metadata.title =
    $('meta[property="og:title"]').attr('content') ||
    $('meta[name="twitter:title"]').attr('content') ||
    $('h1').first().text().trim() ||
    $('title').text().trim();

  // Clean up title - remove site name suffix
  if (metadata.title && metadata.title.includes('|')) {
    metadata.title = metadata.title.split('|')[0].trim();
  }
  if (metadata.title && metadata.title.includes(' - ')) {
    const parts = metadata.title.split(' - ');
    if (parts[0].length > 10) {
      metadata.title = parts[0].trim();
    }
  }

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
    $('.author-name').first().text().trim();

  // Published date
  metadata.publishedDate =
    $('meta[property="article:published_time"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    $('meta[name="date"]').attr('content');

  // Featured image (for og:image)
  metadata.imageUrl =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content');

  // Site name
  metadata.siteName =
    $('meta[property="og:site_name"]').attr('content');

  // Clean up values
  Object.keys(metadata).forEach(key => {
    if (metadata[key]) {
      metadata[key] = sanitizeText(metadata[key]);
    }
  });

  return metadata;
}

/**
 * Sanitize and clean text content
 */
function sanitizeText(text) {
  if (!text) return '';

  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Convert content element to structured HTML
 * Only keep meaningful content elements
 */
function contentToHtml($, content) {
  const clone = content.clone();

  // Remove all attributes except essential ones
  clone.find('*').each((_, el) => {
    const $el = $(el);
    const tagName = el.tagName.toLowerCase();
    const allowedAttrs = ['href', 'src', 'alt'];
    const attrs = Object.keys(el.attribs || {});

    attrs.forEach(attr => {
      if (!allowedAttrs.includes(attr)) {
        $el.removeAttr(attr);
      }
    });

    // Only keep src for actual content images
    if (tagName === 'img') {
      const src = $el.attr('src') || '';
      if (!src || src.length < 10) {
        $el.remove();
      }
    }
  });

  // Remove any remaining empty containers
  clone.find('div, span, section').each((_, el) => {
    const $el = $(el);
    const html = $el.html() || '';
    if (html.trim() === '') {
      $el.remove();
    }
  });

  return clone.html();
}

/**
 * Convert content element to plain text
 */
function contentToText($, content) {
  const clone = content.clone();

  // Add spacing after block elements
  clone.find('p, h1, h2, h3, h4, h5, h6, li, br').each((_, el) => {
    $(el).append('\n');
  });

  clone.find('div, section, article').each((_, el) => {
    $(el).append('\n\n');
  });

  let text = clone.text();
  text = normalizeWhitespace(text);

  // Remove repeated short lines (often navigation remnants)
  const lines = text.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();

    // Skip empty lines - we'll handle spacing later
    if (trimmed.length === 0) return true;

    // Check against noise patterns
    for (const pattern of NOISE_TEXT_PATTERNS) {
      if (pattern.test(trimmed)) {
        return false;
      }
    }

    // Keep lines that are substantial (have spaces = likely sentences)
    // Or are reasonably long
    return trimmed.length > 25 || trimmed.includes(' ');
  });

  return filteredLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Main parsing function
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
