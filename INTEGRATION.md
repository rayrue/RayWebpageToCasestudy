# Internal Integration Guide: Customer Story Extraction Service

> **Audience**: Internal development team integrating this service with the core application

## Overview

This service extracts customer stories from web URLs and generates branded PDF documents via Gamma. The core app will:
1. Store a `gammaThemeId` on admin accounts
2. Add "Import from Webpage" to the import dropdown
3. Call this service with the URL
4. Receive back a PDF URL + metadata
5. Import the PDF as an asset using the existing asset import endpoint

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CORE APPLICATION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐   │
│  │  Admin Account  │     │  Import Dropdown │     │  Asset Import API   │   │
│  │  Settings Page  │     │  (Add Webpage    │     │  (Accept sourceUrl) │   │
│  │                 │     │   option)        │     │                     │   │
│  │  + gammaThemeId │     └────────┬─────────┘     └──────────▲──────────┘   │
│  └─────────────────┘              │                          │              │
│                                   │                          │              │
└───────────────────────────────────┼──────────────────────────┼──────────────┘
                                    │                          │
                                    ▼                          │
                    ┌───────────────────────────────┐          │
                    │  Story Extraction Service     │          │
                    │  POST /api/extract/single     │──────────┘
                    │                               │   Returns: pdfUrl,
                    │  - Extracts content           │   title, description
                    │  - Generates Gamma doc        │
                    │  - Returns PDF + metadata     │
                    └───────────────────────────────┘
```

---

## Core App Changes Required

### 1. Admin Account Settings Page

Add a field to store the Gamma theme ID:

```
Field: gammaThemeId
Type: String (nullable)
UI: Text input or dropdown populated from /api/extract/gamma/themes
```

**To get available themes:**
```bash
GET https://raywebpagetocasestudy.onrender.com/api/extract/gamma/themes

Response:
{
  "success": true,
  "themes": [
    { "id": "9vcj12yrqzldo65", "name": "Professional Blue", ... },
    { "id": "abc123xyz", "name": "Modern Dark", ... }
  ]
}
```

### 2. Import Dropdown

Add "Import from Webpage" option to the existing import dropdown. When selected:
1. Prompt user for the webpage URL
2. Show loading state (extraction takes 30-90 seconds)
3. On success, import the returned PDF as an asset

### 3. Asset Import API

Modify the asset import endpoint to accept a `sourceUrl` parameter:

```javascript
// Current: accepts file upload
POST /api/assets/import
Content-Type: multipart/form-data
file: <uploaded file>

// Add support for: URL-based import
POST /api/assets/import
Content-Type: application/json
{
  "sourceUrl": "https://assets.api.gamma.app/export/pdf/.../Document.pdf",
  "title": "Acme Corp: 10x Performance Improvement",
  "description": "Customer story about how Acme Corp improved...",
  "type": "case_study"
}
```

The asset import service should fetch the PDF from the sourceUrl rather than requiring the core app to download it first.

---

## Calling the Extraction Service

### Endpoint

```
POST https://raywebpagetocasestudy.onrender.com/api/extract/single
Content-Type: application/json
```

### Request

```json
{
  "url": "https://example.com/customer-story",
  "options": {
    "useGamma": true,
    "gammaThemeId": "<from admin account settings>",
    "gammaFormat": "document",
    "logoUrl": "<optional: customer logo URL>"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `url` | Yes | The customer story webpage URL |
| `options.useGamma` | Yes | Set to `true` to generate PDF |
| `options.gammaThemeId` | Yes | From admin account settings |
| `options.gammaFormat` | No | `document` (default), `presentation`, or `webpage` |
| `options.logoUrl` | No | Logo URL for document header |
| `options.callbackUrl` | No | URL to receive POST when extraction completes (for async workflows) |

### Response

```json
{
  "success": true,
  "storyId": "story_5d99c11684c3",
  "url": "https://example.com/customer-story",
  "extractedAt": "2025-12-04T19:45:00Z",
  "content": {
    "title": "Acme Corp Improves Performance 10x with Our Platform",
    "companyName": "Acme Corp",
    "industry": "Technology",
    "summary": "Acme Corp, a leading technology company, achieved...",
    "metrics": [
      { "value": "10x", "description": "performance improvement" },
      { "value": "50%", "description": "cost reduction" }
    ],
    "quotes": [
      { "text": "This changed everything for us.", "attribution": "Jane Doe, CTO" }
    ]
  },
  "asset": {
    "title": "Acme Corp: 10x Performance Improvement",
    "description": "Customer story highlighting how Acme Corp achieved 10x performance improvement and 50% cost reduction using our platform. Features testimony from Jane Doe, CTO."
  },
  "gamma": {
    "gammaId": "ABC123xyz",
    "gammaUrl": "https://gamma.app/docs/abc123xyz",
    "pdfUrl": "https://assets.api.gamma.app/export/pdf/.../Document.pdf"
  }
}
```

### Key Fields for Asset Import

| Response Field | Use For |
|----------------|---------|
| `asset.title` | Asset title in your system (AI-generated, format: "[Company]: [Key Achievement]") |
| `asset.description` | Asset description in your system (AI-generated, under 200 chars) |
| `gamma.pdfUrl` | Pass to asset import as `sourceUrl` |

**Note:** The `asset.title` and `asset.description` are generated by Claude AI during extraction to create compelling, accurate metadata optimized for asset management systems.

---

## Integration Code Example

```javascript
// In your core application

async function importFromWebpage(webpageUrl, accountId) {
  // 1. Get the account's Gamma theme
  const account = await getAdminAccount(accountId);
  const { gammaThemeId, logoUrl } = account;

  if (!gammaThemeId) {
    throw new Error('Gamma theme not configured for this account');
  }

  // 2. Call extraction service
  const extractionResponse = await fetch(
    'https://raywebpagetocasestudy.onrender.com/api/extract/single',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webpageUrl,
        options: {
          useGamma: true,
          gammaThemeId,
          logoUrl,
        },
      }),
    }
  );

  const result = await extractionResponse.json();

  if (!result.success) {
    throw new Error(result.message || 'Extraction failed');
  }

  // 3. Import the PDF as an asset
  const asset = await importAsset({
    sourceUrl: result.gamma.pdfUrl,
    title: result.asset.title,
    description: result.asset.description,
    type: 'case_study',
    metadata: {
      sourceUrl: webpageUrl,
      storyId: result.storyId,
      companyName: result.content.companyName,
      extractedAt: result.extractedAt,
    },
  });

  return asset;
}
```

---

## Error Handling

| Error Code | Meaning | Action |
|------------|---------|--------|
| `INVALID_URL` | Bad URL format | Show validation error to user |
| `EXTRACTION_FAILED` | Could not extract content | Suggest trying different URL |
| `TIMEOUT` | Request timed out | Retry automatically (up to 3x) |
| `RATE_LIMITED` | Too many requests | Back off and retry |
| `GAMMA_NOT_CONFIGURED` | Service missing Gamma key | Contact platform team |

```javascript
// Error handling example
if (!result.success) {
  if (result.retryable) {
    // Retry with exponential backoff
    await delay(Math.pow(3, attempt) * 1000);
    return retry();
  }

  // Show user-friendly error
  switch (result.error) {
    case 'INVALID_URL':
      showError('Please enter a valid webpage URL');
      break;
    case 'EXTRACTION_FAILED':
      showError('Could not extract content from this page. Try a different URL.');
      break;
    default:
      showError('Something went wrong. Please try again.');
  }
}
```

---

## Timing Expectations

| Operation | Expected Duration |
|-----------|-------------------|
| Basic extraction (no Gamma) | 10-30 seconds |
| With Gamma PDF generation | 60-120 seconds |
| Maximum timeout | 5 minutes |

**UI Recommendation**: Show a progress indicator with messaging like "Extracting content..." → "Generating document..." → "Finalizing PDF..."

---

## Async Workflow with Callbacks

For longer operations or future batch support, use the `callbackUrl` option:

```javascript
// Request with callback
const response = await fetch('/api/extract/single', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com/story',
    options: {
      useGamma: true,
      gammaThemeId: 'abc123',
      callbackUrl: 'https://your-app.com/webhooks/extraction-complete'
    }
  })
});

// You'll receive both:
// 1. Synchronous response (when complete)
// 2. POST to callbackUrl with the same payload
```

**Callback Payload**: Same as the API response (success or error).

---

## Future: Batch Import Support

The service already supports batch processing via CSV upload:

1. **Batch Endpoint**: `POST /api/extract/batch` with CSV file
2. **Status Polling**: `GET /api/story/batch/:batchId`
3. **Callback Support**: Use `callbackUrl` to receive notification per-URL completion

This will be documented separately when batch UI is implemented.

---

## Service URLs

| Environment | URL |
|-------------|-----|
| Production | `https://raywebpagetocasestudy.onrender.com` |
| Local Dev | `http://localhost:3000` |

---

## Contacts

- **Service Owner**: [Your name]
- **Questions**: Slack #platform-team

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-04 | Initial integration guide |
