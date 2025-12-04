const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const logger = require('../utils/logger');

// Initialize Anthropic client
let anthropic = null;

function getClient() {
  if (!anthropic) {
    if (!config.anthropic.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }
  return anthropic;
}

/**
 * EXTRACTOR AGENT
 * Extracts customer story content from raw HTML
 */
async function extractorAgent(rawHtml, sourceUrl) {
  logger.info('Extractor Agent: Starting content extraction');

  const client = getClient();

  const systemPrompt = `You are a content extraction tool. Your ONLY job is to COPY text verbatim from the HTML - never summarize, paraphrase, or rewrite.

## ABSOLUTE RULES - VIOLATION MEANS FAILURE:
1. COPY text exactly as it appears - character for character
2. NEVER summarize or paraphrase - this is forbidden
3. NEVER rewrite quotes in your own words - copy them EXACTLY
4. Include EVERY paragraph from the main article
5. The "content" field must contain the FULL article text (500-2000+ words)

## WHAT TO EXTRACT (copy verbatim):
- Title/headline exactly as written
- Company name exactly as written
- EVERY paragraph of the main story - copy each one completely
- ALL direct quotes - copy the EXACT words inside quotation marks
- Speaker attributions exactly as written (name, title, company)
- All statistics and metrics mentioned
- Problem/challenge sections - copy full paragraphs
- Solution sections - copy full paragraphs
- Results sections - copy full paragraphs

## WHAT TO SKIP:
- Navigation, headers, footers
- Cookie notices, popups, ads
- Social sharing buttons
- "Related articles" sections
- Newsletter signup forms
- Author bios at the end

## QUOTES ARE CRITICAL:
When you see text in quotation marks like:
"This is a direct quote from someone." —Person Name, Title

You MUST copy it EXACTLY:
{"text": "This is a direct quote from someone.", "attribution": "Person Name, Title"}

DO NOT paraphrase quotes. DO NOT summarize what someone said. COPY their exact words.

## OUTPUT FORMAT:
{
  "title": "Copy the exact headline",
  "companyName": "Copy company name exactly",
  "industry": "Industry if mentioned",
  "summary": "Write 1-2 sentences summarizing the story",
  "content": "COPY THE ENTIRE ARTICLE TEXT HERE - every paragraph, verbatim. This should be 500-2000+ words. Separate paragraphs with double newlines.",
  "quotes": [{"text": "EXACT quote text copied verbatim", "attribution": "Person Name, Title as written"}],
  "metrics": [{"value": "100x", "description": "what it measures"}],
  "problem": "Copy the problem/challenge paragraphs verbatim",
  "solution": "Copy the solution paragraphs verbatim",
  "results": "Copy the results/outcomes paragraphs verbatim",
  "assetTitle": "A compelling 5-10 word title for this case study that highlights the key result or transformation. Format: '[Company]: [Key Achievement]' e.g. 'Acme Corp: 10x Faster Deployments'",
  "assetDescription": "A 1-2 sentence description (under 200 chars) summarizing the business impact and who this story features. This will be used when importing the PDF as an asset."
}

REMEMBER: You are a COPY machine, not a summarizer. If your content field is less than 400 words, you failed.`;

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 8192,  // Increased for full verbatim content
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Extract the COMPLETE customer story content from this webpage. Copy ALL paragraphs verbatim - do not summarize.\n\nSource URL: ${sourceUrl}\n\nHTML Content:\n${rawHtml.substring(0, 100000)}`
      }
    ],
  });

  const responseText = response.content[0].text;

  // Parse JSON from response
  try {
    // Find JSON in response (may be wrapped in markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      logger.info(`Extractor Agent: Successfully extracted "${extracted.title}"`);
      return extracted;
    }
  } catch (parseError) {
    logger.error('Extractor Agent: Failed to parse JSON response', parseError);
  }

  // Fallback: return raw text
  return {
    title: 'Extraction Error',
    content: responseText,
    error: 'Failed to parse structured response'
  };
}

/**
 * REVIEWER AGENT
 * Validates extraction quality and catches errors
 */
async function reviewerAgent(extractedData, sourceUrl) {
  logger.info('Reviewer Agent: Validating extracted content');

  const client = getClient();

  const systemPrompt = `You are a quality assurance expert reviewing extracted customer story content. Your job is to:

1. CHECK FOR ERRORS:
   - UI/navigation text that slipped through ("Read more", "Next", "Video caption", etc.)
   - Incomplete sentences or truncated content
   - Repeated content
   - Content that doesn't belong to the main story

2. CHECK FOR COMPLETENESS:
   - Is the title meaningful (not generic like "Customer Story")?
   - Is the company name correctly identified?
   - Are there actual story paragraphs?
   - Are quotes properly attributed?

3. CLEAN UP:
   - Remove any noise that was incorrectly extracted
   - Fix obvious formatting issues
   - Ensure content flows naturally

Return your review as JSON:
{
  "isValid": true/false,
  "qualityScore": 1-10,
  "issues": ["list of issues found"],
  "cleanedData": {
    // The corrected/cleaned extraction data
    "title": "...",
    "companyName": "...",
    "content": "...",
    // etc.
  },
  "suggestions": ["any suggestions for improvement"]
}`;

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Review this extracted customer story content from ${sourceUrl}:\n\n${JSON.stringify(extractedData, null, 2)}`
      }
    ],
  });

  const responseText = response.content[0].text;

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const review = JSON.parse(jsonMatch[0]);
      logger.info(`Reviewer Agent: Quality score ${review.qualityScore}/10, Valid: ${review.isValid}`);
      return review;
    }
  } catch (parseError) {
    logger.error('Reviewer Agent: Failed to parse response', parseError);
  }

  // If review fails, pass through original data
  return {
    isValid: true,
    qualityScore: 5,
    issues: ['Review parsing failed'],
    cleanedData: extractedData,
    suggestions: []
  };
}

/**
 * FORMATTER AGENT
 * Creates beautiful, PDF-ready HTML
 */
async function formatterAgent(reviewedData, sourceUrl) {
  logger.info('Formatter Agent: Creating PDF-ready HTML');

  const client = getClient();

  const systemPrompt = `You are an expert HTML/CSS designer creating beautiful, print-ready customer story pages.

Create a complete, self-contained HTML document that:
1. Looks professional and modern
2. Is optimized for PDF screenshot capture
3. Uses clean typography (system fonts for reliability)
4. Has proper visual hierarchy
5. Highlights key quotes and metrics
6. Includes the source URL as a subtle footer reference

Design requirements:
- Page width: 1200px max, centered
- Clean white background
- Professional color scheme (subtle blues/grays for accents)
- Large, readable title
- Company name prominently displayed
- Pull quotes should stand out visually
- Metrics should be displayed as eye-catching callout boxes
- Proper spacing and margins for readability
- No external dependencies (inline all CSS)

Return ONLY the complete HTML document, starting with <!DOCTYPE html> and ending with </html>.
Do not include any explanation or markdown - just the raw HTML.`;

  const content = reviewedData.cleanedData || reviewedData;

  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Create a beautiful PDF-ready HTML page for this customer story from ${sourceUrl}:\n\n${JSON.stringify(content, null, 2)}`
      }
    ],
  });

  let html = response.content[0].text;

  // Clean up if wrapped in markdown code blocks
  html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

  // Ensure it starts with DOCTYPE
  if (!html.toLowerCase().startsWith('<!doctype')) {
    html = '<!DOCTYPE html>\n' + html;
  }

  logger.info('Formatter Agent: HTML document created');
  return html;
}

/**
 * ORCHESTRATOR
 * Runs all agents in sequence
 */
async function processWithAgents(rawHtml, sourceUrl) {
  logger.info(`AI Agent Pipeline: Starting for ${sourceUrl}`);

  const startTime = Date.now();

  // Step 1: Extract
  const extracted = await extractorAgent(rawHtml, sourceUrl);

  // Step 2: Review
  const reviewed = await reviewerAgent(extracted, sourceUrl);

  // Step 3: Format
  const htmlOutput = await formatterAgent(reviewed, sourceUrl);

  const duration = Date.now() - startTime;
  logger.info(`AI Agent Pipeline: Completed in ${duration}ms`);

  // Return results in the format expected by the rest of the system
  const finalData = reviewed.cleanedData || extracted;

  return {
    title: finalData.title || 'Customer Story',
    textOnly: finalData.content || '',
    htmlStructured: htmlOutput,
    wordCount: (finalData.content || '').split(/\s+/).length,
    estimatedReadTime: `${Math.ceil((finalData.content || '').split(/\s+/).length / 200)} minutes`,
    metadata: {
      title: finalData.title,
      description: finalData.summary || null,
      companyName: finalData.companyName || null,
      industry: finalData.industry || null,
      siteName: new URL(sourceUrl).hostname,
    },
    headings: [],
    quotes: finalData.quotes || [],
    metrics: finalData.metrics || [],
    problem: finalData.problem || null,
    solution: finalData.solution || null,
    results: finalData.results || null,
    aiReview: {
      qualityScore: reviewed.qualityScore,
      issues: reviewed.issues,
      suggestions: reviewed.suggestions,
    },
    pdfReadyHtml: htmlOutput,
    // AI-generated asset metadata for import into external systems
    assetTitle: finalData.assetTitle || null,
    assetDescription: finalData.assetDescription || null,
  };
}

module.exports = {
  extractorAgent,
  reviewerAgent,
  formatterAgent,
  processWithAgents,
};
