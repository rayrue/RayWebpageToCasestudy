const config = require('../config');
const logger = require('../utils/logger');

/**
 * CSS styles for standard HTML view - Professional case study styling
 */
const STANDARD_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.75;
    color: #1a1a1a;
    background-color: #f8f9fa;
    padding: 40px 20px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .container {
    max-width: 720px;
    margin: 0 auto;
    background: white;
    padding: 48px 56px;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  }

  .header {
    margin-bottom: 40px;
  }

  .source-badge {
    display: inline-block;
    font-size: 12px;
    font-weight: 500;
    color: #6366f1;
    background: #eef2ff;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .title {
    font-size: 36px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 20px;
    line-height: 1.25;
    letter-spacing: -0.025em;
  }

  .metadata {
    font-size: 14px;
    color: #6b7280;
    line-height: 1.6;
  }

  .metadata a {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 500;
  }

  .metadata a:hover {
    text-decoration: underline;
  }

  .stats {
    display: flex;
    gap: 20px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #6b7280;
  }

  .stat-icon {
    width: 16px;
    height: 16px;
    opacity: 0.6;
  }

  .content {
    font-size: 17px;
    color: #374151;
  }

  .content > *:first-child {
    margin-top: 0;
  }

  .content h1 {
    font-size: 28px;
    font-weight: 700;
    margin: 48px 0 20px;
    color: #111827;
    letter-spacing: -0.025em;
  }

  .content h2 {
    font-size: 24px;
    font-weight: 600;
    margin: 40px 0 16px;
    color: #1f2937;
    letter-spacing: -0.02em;
  }

  .content h3 {
    font-size: 20px;
    font-weight: 600;
    margin: 32px 0 12px;
    color: #374151;
  }

  .content h4, .content h5, .content h6 {
    font-size: 17px;
    font-weight: 600;
    margin: 24px 0 10px;
    color: #4b5563;
  }

  .content p {
    margin-bottom: 20px;
  }

  .content ul, .content ol {
    margin: 20px 0;
    padding-left: 28px;
  }

  .content li {
    margin-bottom: 10px;
    padding-left: 4px;
  }

  .content li::marker {
    color: #6366f1;
  }

  .content blockquote {
    border-left: 4px solid #6366f1;
    padding: 20px 24px;
    margin: 32px 0;
    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    border-radius: 0 12px 12px 0;
    font-style: italic;
    color: #4c1d95;
    font-size: 18px;
    line-height: 1.7;
  }

  .content blockquote p {
    margin: 0;
  }

  .content blockquote cite {
    display: block;
    margin-top: 12px;
    font-style: normal;
    font-size: 14px;
    font-weight: 600;
    color: #7c3aed;
  }

  .content a {
    color: #4f46e5;
    text-decoration: none;
    font-weight: 500;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s;
  }

  .content a:hover {
    border-bottom-color: #4f46e5;
  }

  .content img {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 28px 0;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }

  .content strong, .content b {
    font-weight: 600;
    color: #111827;
  }

  .content em, .content i {
    font-style: italic;
  }

  .content pre {
    background: #1e1e1e;
    color: #d4d4d4;
    padding: 20px;
    border-radius: 12px;
    overflow-x: auto;
    font-size: 14px;
    margin: 24px 0;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  }

  .content code {
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 15px;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
    color: #dc2626;
  }

  .content pre code {
    background: none;
    padding: 0;
    color: inherit;
  }

  .content hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 40px 0;
  }

  .content table {
    width: 100%;
    border-collapse: collapse;
    margin: 24px 0;
    font-size: 15px;
  }

  .content th, .content td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  .content th {
    font-weight: 600;
    color: #374151;
    background: #f9fafb;
  }

  .footer {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
    font-size: 13px;
    color: #9ca3af;
    text-align: center;
  }
`;

/**
 * CSS styles optimized for PDF/screenshot conversion
 */
const PDF_READY_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  @page {
    size: 8.5in 11in;
    margin: 0.75in;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: #1a1a1a;
    background: white;
    max-width: 7in;
    margin: 0 auto;
    padding: 0.5in;
    -webkit-font-smoothing: antialiased;
  }

  .header {
    border-bottom: 3px solid #6366f1;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }

  .source-badge {
    display: inline-block;
    font-size: 9pt;
    font-weight: 600;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }

  .title {
    font-size: 22pt;
    font-weight: 700;
    color: #111;
    margin-bottom: 16px;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .metadata {
    font-size: 9pt;
    color: #666;
    line-height: 1.6;
  }

  .metadata-row {
    margin-bottom: 4px;
  }

  .stats {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 9pt;
    color: #888;
  }

  .content {
    font-size: 10.5pt;
    color: #333;
  }

  .content > *:first-child {
    margin-top: 0;
  }

  .content h1 {
    font-size: 18pt;
    font-weight: 700;
    margin: 28px 0 14px;
    color: #111;
    page-break-after: avoid;
    letter-spacing: -0.02em;
  }

  .content h2 {
    font-size: 15pt;
    font-weight: 600;
    margin: 24px 0 12px;
    color: #222;
    page-break-after: avoid;
  }

  .content h3 {
    font-size: 13pt;
    font-weight: 600;
    margin: 20px 0 10px;
    color: #333;
    page-break-after: avoid;
  }

  .content h4, .content h5, .content h6 {
    font-size: 11pt;
    font-weight: 600;
    margin: 16px 0 8px;
    color: #444;
    page-break-after: avoid;
  }

  .content p {
    margin-bottom: 14px;
    text-align: justify;
    hyphens: auto;
    orphans: 3;
    widows: 3;
  }

  .content ul, .content ol {
    margin: 14px 0;
    padding-left: 24px;
  }

  .content li {
    margin-bottom: 8px;
  }

  .content blockquote {
    border-left: 4px solid #6366f1;
    padding: 16px 20px;
    margin: 20px 0;
    background: #f8f7ff;
    font-style: italic;
    color: #4c1d95;
    page-break-inside: avoid;
    font-size: 11pt;
  }

  .content blockquote p {
    margin: 0;
    text-align: left;
  }

  .content blockquote cite {
    display: block;
    margin-top: 10px;
    font-style: normal;
    font-size: 9pt;
    font-weight: 600;
    color: #7c3aed;
  }

  .content a {
    color: #4f46e5;
    text-decoration: none;
  }

  .content strong, .content b {
    font-weight: 600;
    color: #111;
  }

  .content img {
    max-width: 100%;
    height: auto;
    margin: 16px 0;
    page-break-inside: avoid;
  }

  .content pre {
    background: #f5f5f5;
    padding: 14px;
    font-size: 9pt;
    overflow-x: auto;
    margin: 14px 0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    page-break-inside: avoid;
    font-family: 'Courier New', monospace;
  }

  .content code {
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    background: #f0f0f0;
    padding: 1px 4px;
    border-radius: 3px;
  }

  .content pre code {
    background: none;
    padding: 0;
  }

  .content table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }

  .content th, .content td {
    padding: 8px 12px;
    text-align: left;
    border: 1px solid #e0e0e0;
  }

  .content th {
    font-weight: 600;
    background: #f5f5f5;
  }

  .page-break {
    page-break-after: always;
  }

  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
    font-size: 8pt;
    color: #888;
    text-align: center;
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
 * Extract domain from URL for display
 */
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Render standard HTML template for web viewing
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
  const sourceDomain = getDomain(originalUrl);
  const extractedDate = formatDate(extractedAt);
  const author = content.metadata?.author ? escapeHtml(content.metadata.author) : null;
  const publishedDate = content.metadata?.publishedDate ? formatDate(content.metadata.publishedDate) : null;
  const siteName = content.metadata?.siteName ? escapeHtml(content.metadata.siteName) : sourceDomain;

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
      <span class="source-badge">Customer Story</span>
      <h1 class="title">${title}</h1>
      <div class="metadata">
        ${siteName ? `<div>From <a href="${sourceUrl}" target="_blank" rel="noopener">${siteName}</a></div>` : ''}
        ${author ? `<div>By ${author}</div>` : ''}
        ${publishedDate ? `<div>Published ${publishedDate}</div>` : ''}
      </div>
      <div class="stats">
        <span class="stat">
          <svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
          ${content.wordCount.toLocaleString()} words
        </span>
        <span class="stat">
          <svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          ${content.estimatedReadTime} read
        </span>
      </div>
    </div>

    <div class="content">
      ${content.htmlStructured || `<p>${escapeHtml(content.textOnly)}</p>`}
    </div>

    <div class="footer">
      Extracted on ${extractedDate} • Story ID: ${storyId}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Render PDF-ready HTML template optimized for URL Box screenshots
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
  const sourceDomain = getDomain(originalUrl);
  const extractedDate = formatDate(extractedAt);
  const author = content.metadata?.author ? escapeHtml(content.metadata.author) : null;
  const publishedDate = content.metadata?.publishedDate ? formatDate(content.metadata.publishedDate) : null;
  const siteName = content.metadata?.siteName ? escapeHtml(content.metadata.siteName) : sourceDomain;

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
    <span class="source-badge">Customer Story</span>
    <h1 class="title">${title}</h1>
    <div class="metadata">
      <div class="metadata-row">Source: ${siteName} (${sourceUrl})</div>
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
    Story ID: ${storyId} • Generated for PDF conversion
  </div>
</body>
</html>`;
}

/**
 * Generate URL Box screenshot URL
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
 */
function renderBatchDashboard(batchData) {
  const { batchId, createdAt, totalUrls, completed, failed, results } = batchData;

  const resultRows = results.map(r => {
    const statusClass = r.status === 'completed' ? 'success' : r.status === 'failed' ? 'error' : 'pending';
    return `
      <tr class="${statusClass}">
        <td>${escapeHtml(r.name || getDomain(r.url))}</td>
        <td><a href="${escapeHtml(r.url)}" target="_blank">${escapeHtml(r.url)}</a></td>
        <td class="status">${r.status}</td>
        <td>${r.status === 'completed' ? `<a href="${r.htmlPageUrl}">View Story</a>` : r.error || '-'}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Batch ${batchId}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px 20px; background: #f8f9fa; }
    .container { max-width: 1000px; margin: 0 auto; background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; color: #111; }
    .meta { color: #6b7280; margin-bottom: 32px; font-size: 14px; }
    .stats { display: flex; gap: 20px; margin-bottom: 32px; }
    .stat { background: #f9fafb; padding: 20px 28px; border-radius: 12px; text-align: center; flex: 1; }
    .stat-value { font-size: 36px; font-weight: 700; }
    .stat-label { color: #6b7280; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    tr:hover { background: #fafafa; }
    tr.success .status { color: #059669; font-weight: 500; }
    tr.error .status { color: #dc2626; font-weight: 500; }
    tr.pending .status { color: #d97706; font-weight: 500; }
    a { color: #4f46e5; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Batch Processing Results</h1>
    <div class="meta">
      Batch ID: ${batchId} • Created: ${formatDate(createdAt)}
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${totalUrls}</div>
        <div class="stat-label">Total URLs</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #059669;">${completed}</div>
        <div class="stat-label">Completed</div>
      </div>
      <div class="stat">
        <div class="stat-value" style="color: #dc2626;">${failed}</div>
        <div class="stat-label">Failed</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Company</th>
          <th>Source URL</th>
          <th>Status</th>
          <th>Action</th>
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
