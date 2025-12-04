const config = require('../config');
const logger = require('../utils/logger');
const { generateStoryId, generateBatchId, formatDate } = require('../utils/helpers');
const { ExtractionError, ErrorTypes } = require('../utils/errors');
const extractionService = require('./extractionService');
const parsingService = require('./parsingService');
const templateService = require('./templateService');
const storageService = require('./storageService');
const aiAgentService = require('./aiAgentService');
const gammaService = require('./gammaService');

/**
 * Check if AI agents are available
 */
function isAiEnabled() {
  return Boolean(config.anthropic.apiKey);
}

/**
 * Generate asset title and description for import into external systems
 * @param {Object} content - Extracted content
 * @param {Object} parsedContent - Full parsed content with metrics, quotes, etc.
 * @returns {Object} Asset metadata with title and description
 */
function generateAssetMetadata(content, parsedContent) {
  // Generate title: "[Company]: [Key Metric or Title Summary]"
  const companyName = parsedContent.metadata?.companyName;
  const title = content.title || 'Customer Story';

  let assetTitle;
  if (companyName && parsedContent.metrics?.length > 0) {
    // Use first metric as headline
    const topMetric = parsedContent.metrics[0];
    assetTitle = `${companyName}: ${topMetric.value} ${topMetric.description}`;
  } else if (companyName) {
    assetTitle = `${companyName} - ${title}`;
  } else {
    assetTitle = title;
  }

  // Generate description: Summary + key metrics + quote attribution
  const parts = [];

  // Add summary or first 150 chars of content
  if (parsedContent.metadata?.description) {
    parts.push(parsedContent.metadata.description);
  } else if (content.textOnly) {
    const summary = content.textOnly.substring(0, 150).trim();
    parts.push(summary + (content.textOnly.length > 150 ? '...' : ''));
  }

  // Add metrics summary
  if (parsedContent.metrics?.length > 0) {
    const metricsText = parsedContent.metrics
      .slice(0, 3)
      .map(m => `${m.value} ${m.description}`)
      .join(', ');
    parts.push(`Key results: ${metricsText}.`);
  }

  // Add quote attribution if available
  if (parsedContent.quotes?.length > 0) {
    const firstQuote = parsedContent.quotes[0];
    if (firstQuote.attribution) {
      parts.push(`Features testimony from ${firstQuote.attribution}.`);
    }
  }

  // Add industry if available
  if (parsedContent.metadata?.industry) {
    parts.push(`Industry: ${parsedContent.metadata.industry}.`);
  }

  const assetDescription = parts.join(' ');

  return {
    title: assetTitle,
    description: assetDescription,
  };
}

/**
 * Check if Gamma is available
 */
function isGammaEnabled() {
  return gammaService.isGammaEnabled();
}

/**
 * Send callback notification when extraction completes
 * @param {string} callbackUrl - URL to POST results to
 * @param {Object} result - Extraction result
 */
async function sendCallback(callbackUrl, result) {
  if (!callbackUrl) return;

  try {
    logger.info(`Sending callback to: ${callbackUrl}`);
    const axios = require('axios');
    await axios.post(callbackUrl, result, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    logger.info(`Callback sent successfully to: ${callbackUrl}`);
  } catch (error) {
    logger.error(`Callback failed to ${callbackUrl}: ${error.message}`);
    // Don't throw - callback failure shouldn't fail the extraction
  }
}

/**
 * Process a single URL and generate story HTML
 * @param {string} url - URL to extract
 * @param {Object} options - Processing options (including optional existingStoryId for retries)
 * @returns {Promise<Object>} Story result
 */
async function processSingleUrl(url, options = {}) {
  // Use existing story ID for retries, or generate new one
  const storyId = options.existingStoryId || generateStoryId();
  const extractedAt = formatDate();

  logger.info(`Processing URL: ${url} (${storyId})`);

  // Initialize story record
  const storyData = {
    storyId,
    originalUrl: url,
    status: 'processing',
    extractedAt,
    content: null,
    error: null,
  };

  try {
    // Step 1: Fetch the URL
    logger.debug(`Step 1: Fetching URL - ${storyId}`);
    const { html, url: finalUrl } = await extractionService.fetchUrl(url, {
      timeout: options.timeout || config.fetchTimeout,
      maxRetries: options.maxRetries || config.maxRetries,
    });

    // Update URL if redirected
    if (finalUrl !== url) {
      storyData.originalUrl = finalUrl;
      logger.debug(`URL redirected to: ${finalUrl}`);
    }

    let parsedContent;
    let standardHtml;
    let pdfReadyHtml;

    // Check if AI agents are enabled
    if (isAiEnabled()) {
      // Use AI Agent Pipeline
      logger.info(`Using AI Agent Pipeline for ${storyId}`);

      // Step 2: Process with AI agents (extract, review, format)
      logger.debug(`Step 2: AI Agent Processing - ${storyId}`);
      parsedContent = await aiAgentService.processWithAgents(html, finalUrl);

      // Step 3: AI already generates the HTML
      logger.debug(`Step 3: Using AI-generated HTML - ${storyId}`);
      pdfReadyHtml = parsedContent.pdfReadyHtml;

      // Generate standard HTML using template (for consistency)
      storyData.content = {
        title: parsedContent.title,
        textOnly: parsedContent.textOnly,
        htmlStructured: parsedContent.htmlStructured,
        wordCount: parsedContent.wordCount,
        estimatedReadTime: parsedContent.estimatedReadTime,
        metadata: parsedContent.metadata,
        headings: parsedContent.headings,
        quotes: parsedContent.quotes,
      };
      standardHtml = templateService.renderStandardHtml(storyData);

    } else {
      // Use rule-based parsing (fallback)
      logger.info(`Using rule-based parsing for ${storyId} (no AI key configured)`);

      // Step 2: Parse and clean HTML
      logger.debug(`Step 2: Parsing HTML - ${storyId}`);
      parsedContent = parsingService.parse(html);

      // Step 3: Build content object
      storyData.content = {
        title: parsedContent.title,
        textOnly: parsedContent.textOnly,
        htmlStructured: parsedContent.htmlStructured,
        wordCount: parsedContent.wordCount,
        estimatedReadTime: parsedContent.estimatedReadTime,
        metadata: parsedContent.metadata,
        headings: parsedContent.headings,
        quotes: parsedContent.quotes,
      };

      // Step 4: Generate HTML templates
      logger.debug(`Step 3: Generating HTML templates - ${storyId}`);
      standardHtml = templateService.renderStandardHtml(storyData);
      pdfReadyHtml = templateService.renderPdfReadyHtml(storyData);
    }

    // Step 5: Save to storage
    logger.debug(`Step 4: Saving to storage - ${storyId}`);
    storageService.saveHtmlFiles(storyId, standardHtml, pdfReadyHtml);

    // Update status to completed
    storyData.status = 'completed';
    storyData.files = {
      standardHtml: `/stories/${storyId}/index.html`,
      pdfReadyHtml: `/stories/${storyId}/pdf-ready.html`,
    };

    // Save to database
    storageService.saveStory(storyData);

    logger.info(`Successfully processed URL: ${url} (${storyId})`);

    // Build response
    const htmlPageUrl = `${config.baseUrl}/stories/${storyId}/index.html`;
    const pdfReadyUrl = `${config.baseUrl}/stories/${storyId}/pdf-ready.html`;
    const urlBoxLink = templateService.generateUrlBoxLink(pdfReadyUrl);

    const response = {
      success: true,
      storyId,
      url: storyData.originalUrl,
      extractedAt,
      processingMethod: isAiEnabled() ? 'ai-agents' : 'rule-based',
      content: {
        title: storyData.content.title,
        textOnly: storyData.content.textOnly,
        wordCount: storyData.content.wordCount,
        estimatedReadTime: storyData.content.estimatedReadTime,
      },
      htmlPageUrl,
      pdfReadyUrl,
      urlBoxScreenshotLink: urlBoxLink,
    };

    // Add AI-specific data if available
    if (isAiEnabled() && parsedContent.aiReview) {
      response.aiReview = parsedContent.aiReview;
      response.content.companyName = parsedContent.metadata?.companyName || null;
      response.content.industry = parsedContent.metadata?.industry || null;
      response.content.metrics = parsedContent.metrics || [];
      response.content.problem = parsedContent.problem || null;
      response.content.solution = parsedContent.solution || null;
      response.content.results = parsedContent.results || null;
      response.content.quotes = parsedContent.quotes || [];
    }

    // Generate asset metadata for import into external systems
    // Prefer AI-generated metadata, fall back to programmatic generation
    if (parsedContent.assetTitle && parsedContent.assetDescription) {
      response.asset = {
        title: parsedContent.assetTitle,
        description: parsedContent.assetDescription,
      };
    } else {
      response.asset = generateAssetMetadata(storyData.content, parsedContent);
    }

    // Generate Gamma document if requested and available
    if (options.useGamma && isGammaEnabled()) {
      try {
        logger.info(`Generating Gamma document for ${storyId}`);
        const gammaResult = await gammaService.generateAndExport(
          {
            title: storyData.content.title,
            companyName: parsedContent.metadata?.companyName,
            industry: parsedContent.metadata?.industry,
            summary: parsedContent.metadata?.description,
            content: storyData.content.textOnly,
            metrics: parsedContent.metrics || [],
            quotes: parsedContent.quotes || [],
            problem: parsedContent.problem,
            solution: parsedContent.solution,
            results: parsedContent.results,
          },
          {
            themeId: options.gammaThemeId || config.gamma.defaultThemeId,
            outputFormat: options.gammaFormat || 'document',
            logoUrl: options.logoUrl || null,
          }
        );

        response.gamma = {
          gammaId: gammaResult.gammaId,
          gammaUrl: gammaResult.gammaUrl,
          pdfUrl: gammaResult.pdfUrl,
          pdfExpiresAt: gammaResult.pdfExpiresAt,
        };
        logger.info(`Gamma document created: ${gammaResult.gammaUrl}`);
      } catch (gammaError) {
        logger.error(`Gamma generation failed: ${gammaError.message}`);
        response.gammaError = gammaError.message;
      }
    }

    // Send callback if URL provided (fire-and-forget)
    if (options.callbackUrl) {
      sendCallback(options.callbackUrl, response);
    }

    return response;
  } catch (error) {
    // Handle extraction errors
    const extractionError = error instanceof ExtractionError
      ? error
      : new ExtractionError(ErrorTypes.UNKNOWN, error.message);

    storyData.status = 'failed';
    storyData.error = extractionError.type;

    // Save failed story to database
    storageService.saveStory(storyData);

    logger.error(`Failed to process URL: ${url} - ${extractionError.message}`);

    const errorResponse = {
      success: false,
      storyId: null,
      error: extractionError.type,
      message: extractionError.message,
      url,
      retryable: extractionError.retryable,
    };

    // Send callback on failure too
    if (options.callbackUrl) {
      sendCallback(options.callbackUrl, errorResponse);
    }

    return errorResponse;
  }
}

/**
 * Process a batch of URLs from parsed CSV data
 * @param {Array} urlList - Array of {url, name, priority} objects
 * @returns {Promise<Object>} Batch result
 */
async function processBatch(urlList) {
  const batchId = generateBatchId();
  const createdAt = formatDate();

  logger.info(`Starting batch processing: ${batchId} (${urlList.length} URLs)`);

  // Initialize batch record
  const batchData = {
    batchId,
    totalUrls: urlList.length,
    processed: 0,
    completed: 0,
    failed: 0,
    stories: [],
    results: [],
    createdAt,
  };

  // Save initial batch record
  storageService.saveBatch(batchData);

  // Process URLs with concurrency control
  const concurrency = config.maxConcurrentWorkers;
  const results = [];

  // Process in batches of `concurrency` size
  for (let i = 0; i < urlList.length; i += concurrency) {
    const batch = urlList.slice(i, i + concurrency);

    const batchPromises = batch.map(async (item) => {
      const { url, name, priority } = item;

      try {
        const result = await processSingleUrl(url, {
          timeout: priority === 'high' ? config.fetchTimeout * 1.5 : config.fetchTimeout,
        });

        return {
          ...result,
          name: name || null,
          priority: priority || 'medium',
        };
      } catch (error) {
        return {
          success: false,
          storyId: null,
          url,
          name: name || null,
          status: 'failed',
          error: error.message,
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Update batch progress
    const completedCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    batchData.processed = results.length;
    batchData.completed = completedCount;
    batchData.failed = failedCount;
    batchData.stories = results.filter(r => r.storyId).map(r => r.storyId);

    storageService.updateBatch(batchId, batchData);

    logger.info(`Batch ${batchId} progress: ${results.length}/${urlList.length}`);
  }

  // Build final results
  batchData.results = results.map(r => ({
    storyId: r.storyId,
    url: r.url,
    name: r.name,
    status: r.success ? 'completed' : 'failed',
    htmlPageUrl: r.success ? r.htmlPageUrl : null,
    pdfReadyUrl: r.success ? r.pdfReadyUrl : null,
    error: r.success ? null : r.error,
  }));

  // Generate batch dashboard
  const dashboardHtml = templateService.renderBatchDashboard(batchData);
  storageService.saveBatchDashboard(batchId, dashboardHtml);

  // Final update
  storageService.updateBatch(batchId, {
    processed: batchData.processed,
    completed: batchData.completed,
    failed: batchData.failed,
    stories: batchData.stories,
  });

  logger.info(`Batch ${batchId} completed: ${batchData.completed} succeeded, ${batchData.failed} failed`);

  return {
    success: true,
    batchId,
    totalUrls: batchData.totalUrls,
    createdAt,
    results: batchData.results,
    batchDashboardUrl: `${config.baseUrl}/batches/${batchId}`,
  };
}

/**
 * Get story status and data
 * @param {string} storyId - Story ID
 * @returns {Object|null} Story data or null
 */
function getStoryStatus(storyId) {
  const story = storageService.getStory(storyId);

  if (!story) {
    return null;
  }

  // Get HTML content if available
  let htmlContent = null;
  let pdfReadyHtml = null;

  if (story.status === 'completed') {
    htmlContent = storageService.getHtmlFile(storyId, 'index.html');
    pdfReadyHtml = storageService.getHtmlFile(storyId, 'pdf-ready.html');
  }

  return {
    storyId: story.storyId,
    url: story.originalUrl,
    extractedAt: story.extractedAt,
    status: story.status,
    htmlContent,
    pdfReadyHtml,
    error: story.error,
  };
}

/**
 * Get batch status and results
 * @param {string} batchId - Batch ID
 * @returns {Object|null} Batch data or null
 */
function getBatchStatus(batchId) {
  const batch = storageService.getBatch(batchId);

  if (!batch) {
    return null;
  }

  // Get results for each story
  const results = batch.stories.map(storyId => {
    const story = storageService.getStory(storyId);
    if (!story) return null;

    return {
      storyId,
      url: story.originalUrl,
      status: story.status,
      htmlPageUrl: story.status === 'completed'
        ? `${config.baseUrl}/stories/${storyId}/index.html`
        : null,
      error: story.error,
    };
  }).filter(Boolean);

  return {
    batchId: batch.batchId,
    totalUrls: batch.totalUrls,
    processed: batch.processed,
    completed: batch.completed,
    failed: batch.failed,
    createdAt: batch.createdAt,
    results,
    batchDashboardUrl: `${config.baseUrl}/batches/${batch.batchId}`,
  };
}

/**
 * Retry failed stories in a batch
 * @param {string} batchId - Batch ID
 * @returns {Promise<Object>} Retry results
 */
async function retryFailedStories(batchId) {
  const batch = storageService.getBatch(batchId);

  if (!batch) {
    throw new ExtractionError(ErrorTypes.NOT_FOUND, `Batch not found: ${batchId}`);
  }

  // Find failed stories
  const failedStories = batch.stories
    .map(storyId => storageService.getStory(storyId))
    .filter(story => story && story.status === 'failed');

  if (failedStories.length === 0) {
    return {
      success: true,
      message: 'No failed stories to retry',
      retried: 0,
    };
  }

  logger.info(`Retrying ${failedStories.length} failed stories in batch ${batchId}`);

  // Retry with existing story IDs to update in place
  const retryResults = await Promise.all(
    failedStories.map(story => processSingleUrl(story.originalUrl, {
      existingStoryId: story.storyId,  // Reuse existing story ID
    }))
  );

  const succeeded = retryResults.filter(r => r.success).length;
  const stillFailed = retryResults.filter(r => !r.success).length;

  // Update batch counts
  storageService.updateBatch(batchId, {
    completed: batch.completed + succeeded,
    failed: batch.failed - succeeded,
  });

  // Regenerate batch dashboard with updated results
  const updatedBatch = storageService.getBatch(batchId);
  const dashboardResults = updatedBatch.stories.map(storyId => {
    const story = storageService.getStory(storyId);
    if (!story) return null;
    return {
      storyId,
      url: story.originalUrl,
      name: null,
      status: story.status,
      htmlPageUrl: story.status === 'completed'
        ? `${config.baseUrl}/stories/${storyId}/index.html`
        : null,
      error: story.error,
    };
  }).filter(Boolean);

  const dashboardHtml = templateService.renderBatchDashboard({
    ...updatedBatch,
    results: dashboardResults,
  });
  storageService.saveBatchDashboard(batchId, dashboardHtml);

  return {
    success: true,
    retried: failedStories.length,
    succeeded,
    stillFailed,
    results: retryResults,
  };
}

module.exports = {
  processSingleUrl,
  processBatch,
  getStoryStatus,
  getBatchStatus,
  retryFailedStories,
};
