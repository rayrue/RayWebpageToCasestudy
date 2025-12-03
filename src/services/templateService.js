const config = require('../config');
const logger = require('../utils/logger');

/**
 * CSS styles for standard HTML view
 */
const STANDARD_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.7;
    color: #333;
    background-color: #f9fafb;
    padding: 20px;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    padding: 40px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .header {
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }

  .title {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 16px;
    line-height: 1.2;
  }

  .metadata {
    font-size: 14px;
    color: #6b7280;
  }

  .metadata a {
    color: #3b82f6;
    text-decoration: none;
  }

  .metadata a:hover {
    text-decoration: underline;
  }

  .stats {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    font-size: 13px;
    color: #9ca3af;
  }

  .content {
    font-size: 17px;
  }

  .content h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 32px 0 16px;
    color: #111827;
  }

  .content h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 28px 0 14px;
    color: #1f2937;
  }

  .content h3 {
    font-size: 20px;
    font-weight: 600;
    margin: 24px 0 12px;
    color: #374151;
  }

  .content h4, .content h5, .content h6 {
    font-size: 18px;
    font-weight: 600;
    margin: 20px 0 10px;
    color: #4b5563;
  }

  .content p {
    margin-bottom: 16px;
  }

  .content ul, .content ol {
    margin: 16px 0;
    padding-left: 24px;
  }

  .content li {
    margin-bottom: 8px;
  }

  .content blockquote {
    border-left: 4px solid #3b82f6;
    padding: 16px 20px;
    margin: 24px 0;
    background: #f3f4f6;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #4b5563;
  }

  .content blockquote p {
    margin: 0;
  }

  .content a {
    color: #3b82f6;
    text-decoration: none;
  }

  .content a:hover {
    text-decoration: underline;
  }

  .content img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 16px 0;
  }

  .content pre {
    background: #1f2937;
    color: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 14px;
    margin: 16px 0;
  }

  .content code {
    background: #e5e7eb;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 14px;
  }

  .content pre code {
    background: none;
    padding: 0;
  }

  .footer {
    margin-top: 40px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    color: #9ca3af;
  }
`;

/**
 * CSS styles optimized for PDF/screenshot conversion
 */
const PDF_READY_STYLES = `
  @page {
    size: 8.5in 11in;
    margin: 0.5in;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #333;
    background: white;
    width: 7.5in;
    max-width: 7.5in;
    margin: 0 auto;
    padding: 0.5in;
  }

  .header {
    border-bottom: 2px solid #333;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }

  .title {
    font-size: 24pt;
    font-weight: bold;
    color: #111;
    margin-bottom: 12px;
    line-height: 1.2;
  }

  .metadata {
    font-size: 10pt;
    color: #666;
  }

  .metadata-row {
    margin-bottom: 4px;
  }

  .stats {
    margin-top: 8px;
    font-size: 9pt;
    color: #888;
  }

  .content {
    font-size: 11pt;
  }

  .content h1 {
    font-size: 20pt;
    font-weight: bold;
    margin: 24px 0 12px;
    color: #111;
    page-break-after: avoid;
  }

  .content h2 {
    font-size: 16pt;
    font-weight: bold;
    margin: 20px 0 10px;
    color: #222;
    page-break-after: avoid;
  }

  .content h3 {
    font-size: 14pt;
    font-weight: bold;
    margin: 16px 0 8px;
    color: #333;
    page-break-after: avoid;
  }

  .content h4, .content h5, .content h6 {
    font-size: 12pt;
    font-weight: bold;
    margin: 14px 0 6px;
    color: #444;
    page-break-after: avoid;
  }

  .content p {
    margin-bottom: 12px;
    text-align: justify;
    orphans: 3;
    widows: 3;
  }

  .content ul, .content ol {
    margin: 12px 0;
    padding-left: 20px;
  }

  .content li {
    margin-bottom: 6px;
  }

  .content blockquote {
    border-left: 4px solid #667eea;
    padding: 12px 16px;
    margin: 16px 0;
    background: #f5f5f5;
    font-style: italic;
    color: #555;
    page-break-inside: avoid;
  }

  .content blockquote p {
    margin: 0;
  }

  .content a {
    color: #333;
    text-decoration: underline;
  }

  .content img {
    max-width: 100%;
    height: auto;
    margin: 12px 0;
    page-break-inside: avoid;
  }

  .content pre {
    background: #f5f5f5;
    padding: 12px;
    font-size: 9pt;
    overflow-x: auto;
    margin: 12px 0;
    border: 1px solid #ddd;
    page-break-inside: avoid;
  }

  .content code {
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    background: #f0f0f0;
    padding: 1px 4px;
  }

  .content pre code {
    background: none;
    padding: 0;
  }

  .page-break {
    page-break-after: always;
  }

  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #ddd;
    font-size: 9pt;
    color: #888;
  }

  /* Avoid breaking inside these elements */
  .content blockquote,
  .content pre,
  .content img,
  .content table {
    page-break-inside: avoid;
  }

  /* Keep headings with following content */
  .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
    page-break-after: avoid;
  }
`;

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Format the extracted date nicely
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Render standard HTML template for web viewing
 * @param {Object} storyData - Story data object
 * @returns {string} Rendered HTML
 */
function renderStandardHtml(storyData) {
  const {
    storyId,
    originalUrl,
    extractedAt,
    content,
  } = storyData;

  const title = escapeHtml(content.title || 'Customer Story');
  const sourceUrl = escapeHtml(originalUrl);
  const extractedDate = formatDate(extractedAt);
  const author = content.metadata?.author ? escapeHtml(content.metadata.author) : null;
  const publishedDate = content.metadata?.publishedDate ? formatDate(content.metadata.publishedDate) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <style>${STANDARD_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${title}</h1>
      <div class="metadata">
        <div>Source: <a href="${sourceUrl}" target="_blank" rel="noopener">${sourceUrl}</a></div>
        ${author ? `<div>Author: ${author}</div>` : ''}
        ${publishedDate ? `<div>Published: ${publishedDate}</div>` : ''}
      </div>
      <div class="stats">
        <span>${content.wordCount.toLocaleString()} words</span>
        <span>•</span>
        <span>${content.estimatedReadTime} read</span>
      </div>
    </div>

    <div class="content">
      ${content.htmlStructured || `<p>${escapeHtml(content.textOnly)}</p>`}
    </div>

    <div class="footer">
      <p>Extracted on ${extractedDate} | Story ID: ${storyId}</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render PDF-ready HTML template optimized for URL Box screenshots
 * @param {Object} storyData - Story data object
 * @returns {string} Rendered HTML
 */
function renderPdfReadyHtml(storyData) {
  const {
    storyId,
    originalUrl,
    extractedAt,
    content,
  } = storyData;

  const title = escapeHtml(content.title || 'Customer Story');
  const sourceUrl = escapeHtml(originalUrl);
  const extractedDate = formatDate(extractedAt);
  const author = content.metadata?.author ? escapeHtml(content.metadata.author) : null;
  const publishedDate = content.metadata?.publishedDate ? formatDate(content.metadata.publishedDate) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <style>${PDF_READY_STYLES}</style>
</head>
<body>
  <div class="header">
    <h1 class="title">${title}</h1>
    <div class="metadata">
      <div class="metadata-row">Source: ${sourceUrl}</div>
      ${author ? `<div class="metadata-row">Author: ${author}</div>` : ''}
      ${publishedDate ? `<div class="metadata-row">Published: ${publishedDate}</div>` : ''}
      <div class="stats">
        ${content.wordCount.toLocaleString()} words • ${content.estimatedReadTime} read • Extracted: ${extractedDate}
      </div>
    </div>
  </div>

  <div class="content">
    ${content.htmlStructured || `<p>${escapeHtml(content.textOnly)}</p>`}
  </div>

  <div class="footer">
    <p>Story ID: ${storyId} | Generated for PDF conversion</p>
  </div>
</body>
</html>`;
}

/**
 * Generate URL Box screenshot URL
 * @param {string} htmlUrl - URL of the PDF-ready HTML page
 * @returns {string|null} URL Box URL or null if not configured
 */
function generateUrlBoxLink(htmlUrl) {
  if (!config.urlbox.apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    url: htmlUrl,
    width: config.urlbox.screenshotWidth,
    height: config.urlbox.screenshotHeight,
    format: 'pdf',
    full_page: 'true',
  });

  return `https://api.urlbox.io/v1/${config.urlbox.apiKey}/pdf?${params.toString()}`;
}

/**
 * Render a batch dashboard HTML page
 * @param {Object} batchData - Batch data object
 * @returns {string} Rendered HTML
 */
function renderBatchDashboard(batchData) {
  const { batchId, createdAt, totalUrls, completed, failed, results } = batchData;

  const resultRows = results.map(r => {
    const statusClass = r.status === 'completed' ? 'success' : r.status === 'failed' ? 'error' : 'pending';
    return `
      <tr class="${statusClass}">
        <td>${escapeHtml(r.name || r.url)}</td>
        <td><a href="${escapeHtml(r.url)}" target="_blank">${escapeHtml(r.url)}</a></td>
        <td class="status">${r.status}</td>
        <td>${r.status === 'completed' ? `<a href="${r.htmlPageUrl}">View</a>` : r.error || '-'}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Batch ${batchId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; }
    h1 { font-size: 24px; margin-bottom: 8px; }
    .meta { color: #666; margin-bottom: 24px; }
    .stats { display: flex; gap: 24px; margin-bottom: 24px; }
    .stat { background: #f3f4f6; padding: 16px 24px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { color: #666; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    tr.success .status { color: #10b981; }
    tr.error .status { color: #ef4444; }
    tr.pending .status { color: #f59e0b; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Batch Processing Results</h1>
    <div class="meta">
      Batch ID: ${batchId} | Created: ${formatDate(createdAt)}
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${totalUrls}</div>
        <div class="stat-label">Total URLs</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #10b981;">${completed}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #ef4444;">${failed}</div>
        <div class="stat-label">Failed</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>URL</th>
          <th>Status</th>
          <th>Result</th>
        </tr>
      </thead>
      <tbody>
        ${resultRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

module.exports = {
  renderStandardHtml,
  renderPdfReadyHtml,
  renderBatchDashboard,
  generateUrlBoxLink,
  escapeHtml,
  formatDate,
};
