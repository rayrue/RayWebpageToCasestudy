const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Gamma API Service
 * Generates polished documents/presentations from extracted content
 */

/**
 * Check if Gamma is configured
 */
function isGammaEnabled() {
  return Boolean(config.gamma.apiKey);
}

/**
 * List available themes in the Gamma workspace
 * @returns {Promise<Array>} List of themes
 */
async function listThemes() {
  if (!isGammaEnabled()) {
    throw new Error('Gamma API key not configured');
  }

  const response = await axios.get(`${config.gamma.baseUrl}/themes`, {
    headers: {
      'X-API-KEY': config.gamma.apiKey,
      'Content-Type': 'application/json',
    },
  });

  logger.info(`Gamma: Found ${response.data.themes?.length || 0} themes`);
  return response.data.themes || [];
}

/**
 * Generate a Gamma document from extracted content
 * @param {Object} content - Extracted story content
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated Gamma document info
 */
async function generateDocument(content, options = {}) {
  if (!isGammaEnabled()) {
    throw new Error('Gamma API key not configured');
  }

  const {
    themeId = config.gamma.defaultThemeId,
    outputFormat = 'document', // 'document', 'presentation', 'webpage'
    logoUrl = null,
    companyName = content.companyName,
  } = options;

  // Build the topic/content for Gamma
  const topic = buildGammaPrompt(content);

  const requestBody = {
    topic,
    outputFormat,
    style: {
      tone: 'professional',
      audience: 'business professionals',
    },
  };

  // Add theme if specified
  if (themeId) {
    requestBody.themeId = themeId;
  }

  // Add logo in header if provided
  if (logoUrl) {
    requestBody.cardOptions = {
      headerFooter: {
        topRight: {
          type: 'image',
          source: 'custom',
          src: logoUrl,
          size: 'md',
        },
        bottomLeft: {
          type: 'text',
          value: companyName || '',
        },
      },
    };
  }

  logger.info(`Gamma: Generating ${outputFormat} for "${content.title}"`);

  const response = await axios.post(
    `${config.gamma.baseUrl}/generations`,
    requestBody,
    {
      headers: {
        'X-API-KEY': config.gamma.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minute timeout for generation
    }
  );

  logger.info(`Gamma: Document generated, ID: ${response.data.id}`);

  return {
    gammaId: response.data.id,
    gammaUrl: response.data.url,
    title: response.data.title,
    status: response.data.status,
  };
}

/**
 * Export a Gamma document to PDF
 * @param {string} gammaId - The Gamma document ID
 * @returns {Promise<Object>} Export result with PDF URL
 */
async function exportToPdf(gammaId) {
  if (!isGammaEnabled()) {
    throw new Error('Gamma API key not configured');
  }

  logger.info(`Gamma: Exporting ${gammaId} to PDF`);

  const response = await axios.post(
    `${config.gamma.baseUrl}/gammas/${gammaId}/export`,
    {
      format: 'pdf',
    },
    {
      headers: {
        'X-API-KEY': config.gamma.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 60000,
    }
  );

  return {
    pdfUrl: response.data.url,
    expiresAt: response.data.expiresAt,
  };
}

/**
 * Build a prompt for Gamma from extracted content
 * @param {Object} content - Extracted story content
 * @returns {string} Formatted prompt
 */
function buildGammaPrompt(content) {
  const sections = [];

  // Title
  sections.push(`# ${content.title || 'Customer Story'}`);

  // Company info
  if (content.companyName) {
    sections.push(`## ${content.companyName}`);
    if (content.industry) {
      sections.push(`*Industry: ${content.industry}*`);
    }
  }

  // Summary
  if (content.summary) {
    sections.push(`\n## Overview\n${content.summary}`);
  }

  // Key metrics (if any)
  if (content.metrics && content.metrics.length > 0) {
    sections.push('\n## Key Results');
    content.metrics.forEach(metric => {
      sections.push(`- **${metric.value}**: ${metric.description}`);
    });
  }

  // Problem
  if (content.problem) {
    sections.push(`\n## The Challenge\n${content.problem}`);
  }

  // Solution
  if (content.solution) {
    sections.push(`\n## The Solution\n${content.solution}`);
  }

  // Results
  if (content.results) {
    sections.push(`\n## The Results\n${content.results}`);
  }

  // Quotes
  if (content.quotes && content.quotes.length > 0) {
    sections.push('\n## What They Said');
    content.quotes.forEach(quote => {
      sections.push(`\n> "${quote.text}"\n> — ${quote.attribution}`);
    });
  }

  // Full content if available and not too long
  if (content.content && content.content.length < 50000) {
    sections.push(`\n## Full Story\n${content.content}`);
  }

  return sections.join('\n');
}

/**
 * Full pipeline: Generate document and export to PDF
 * @param {Object} content - Extracted story content
 * @param {Object} options - Options including themeId, logoUrl
 * @returns {Promise<Object>} Result with Gamma URL and PDF URL
 */
async function generateAndExport(content, options = {}) {
  // Generate the document
  const generated = await generateDocument(content, options);

  // Wait a moment for generation to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Export to PDF
  let pdfResult = null;
  try {
    pdfResult = await exportToPdf(generated.gammaId);
  } catch (error) {
    logger.warn(`Gamma: PDF export failed: ${error.message}`);
  }

  return {
    ...generated,
    pdfUrl: pdfResult?.pdfUrl || null,
    pdfExpiresAt: pdfResult?.expiresAt || null,
  };
}

module.exports = {
  isGammaEnabled,
  listThemes,
  generateDocument,
  exportToPdf,
  generateAndExport,
  buildGammaPrompt,
};
