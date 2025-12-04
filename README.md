# Customer Story Extraction & Document Generation Service

A Node.js microservice that extracts customer stories from web URLs and generates polished, branded documents using AI extraction and Gamma.app integration.

## What This App Does

1. **Extracts Content**: Takes a customer story URL and uses Claude AI to intelligently extract the full article content, quotes, metrics, and key sections
2. **Generates HTML**: Creates optimized HTML pages for viewing and PDF conversion
3. **Creates Gamma Documents**: Optionally generates professional, branded presentations/documents via Gamma.app API with custom themes
4. **Exports PDFs**: Returns direct PDF download links from Gamma

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client/API    │────▶│  Express Server  │────▶│  Extraction     │
│   Request       │     │  (Render.com)    │     │  Service        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                        ┌─────────────────────────────────┼─────────────────────────────────┐
                        │                                 ▼                                 │
                        │                        ┌─────────────────┐                        │
                        │                        │  AI Agent       │                        │
                        │                        │  (Claude API)   │                        │
                        │                        └─────────────────┘                        │
                        │                                 │                                 │
                        │         ┌───────────────────────┼───────────────────────┐         │
                        │         ▼                       ▼                       ▼         │
                        │  ┌─────────────┐      ┌─────────────────┐      ┌─────────────┐   │
                        │  │  Extractor  │      │    Reviewer     │      │  Formatter  │   │
                        │  │   Agent     │─────▶│     Agent       │─────▶│   Agent     │   │
                        │  │ (verbatim)  │      │  (quality 1-10) │      │   (HTML)    │   │
                        │  └─────────────┘      └─────────────────┘      └─────────────┘   │
                        │                                                                   │
                        └───────────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
                        ┌─────────────────────────────────────────────────────────────────┐
                        │                      Optional: Gamma Integration                 │
                        │  ┌─────────────────┐     ┌─────────────────┐     ┌───────────┐  │
                        │  │ Build Prompt    │────▶│ Generate Doc    │────▶│ Poll for  │  │
                        │  │ from Content    │     │ (async API)     │     │ Complete  │  │
                        │  └─────────────────┘     └─────────────────┘     └───────────┘  │
                        │                                                        │         │
                        │                                                        ▼         │
                        │                                              ┌─────────────────┐ │
                        │                                              │ Return URLs:    │ │
                        │                                              │ - Gamma Doc     │ │
                        │                                              │ - PDF Download  │ │
                        │                                              └─────────────────┘ │
                        └─────────────────────────────────────────────────────────────────┘
```

## Features

- **AI-Powered Extraction**: Claude AI extracts content verbatim (not summarized) including quotes, metrics, problems, solutions, and results
- **Quality Review**: AI reviewer scores extraction quality 1-10 and can flag issues
- **Gamma Integration**: Generate polished documents with custom branding/themes
- **Multi-tenant Support**: Pass different theme IDs for different customers
- **Batch Processing**: Upload CSV files to process multiple URLs
- **PDF Export**: Direct PDF download links from Gamma
- **SQLite Storage**: Persistent storage of extracted stories

## Quick Start

### Prerequisites

- Node.js 20+
- Anthropic API key (for Claude AI extraction)
- Gamma API key (for document generation)

### Installation

```bash
# Clone the repo
git clone https://github.com/rayrue/RayWebpageToCasestudy.git
cd RayWebpageToCasestudy

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Add your API keys to .env
# ANTHROPIC_API_KEY=sk-ant-...
# GAMMA_API_KEY=sk-gamma-...

# Start the server
npm run dev
```

### Docker Deployment

```bash
docker-compose up -d
```

## API Reference

### Extract Single URL (Basic)

```bash
POST /api/extract/single
Content-Type: application/json

{
  "url": "https://example.com/customer-story"
}
```

### Extract with Gamma Document Generation

```bash
POST /api/extract/single
Content-Type: application/json

{
  "url": "https://example.com/customer-story",
  "options": {
    "useGamma": true,
    "gammaThemeId": "9vcj12yrqzldo65",
    "gammaFormat": "document"
  }
}
```

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `useGamma` | boolean | Enable Gamma document generation |
| `gammaThemeId` | string | Custom theme ID from your Gamma workspace |
| `gammaFormat` | string | `document`, `presentation`, or `webpage` |
| `logoUrl` | string | URL to customer logo for header |

**Response:**
```json
{
  "success": true,
  "storyId": "story_5d99c11684c3",
  "url": "https://example.com/customer-story",
  "extractedAt": "2025-12-04T19:45:00Z",
  "content": {
    "title": "Customer Improves Performance 100X",
    "textOnly": "Full extracted story text...",
    "wordCount": 2847,
    "estimatedReadTime": "12 minutes",
    "companyName": "Acme Corp",
    "industry": "Technology",
    "metrics": [{"value": "100X", "description": "performance improvement"}],
    "quotes": [{"text": "This changed everything...", "attribution": "John Doe, CTO"}]
  },
  "htmlPageUrl": "https://raywebpagetocasestudy.onrender.com/stories/story_5d99c11684c3/index.html",
  "pdfReadyUrl": "https://raywebpagetocasestudy.onrender.com/stories/story_5d99c11684c3/pdf-ready.html",
  "gamma": {
    "gammaId": "ABC123xyz",
    "gammaUrl": "https://gamma.app/docs/abc123xyz",
    "pdfUrl": "https://assets.api.gamma.app/export/pdf/.../Document.pdf"
  }
}
```

### List Gamma Themes

```bash
GET /api/extract/gamma/themes
```

### Extract Batch (CSV Upload)

```bash
POST /api/extract/batch
Content-Type: multipart/form-data

file: urls.csv
```

**CSV Format:**
```csv
url,name,priority
https://example.com/story1,Acme Corp,high
https://example.com/story2,Beta Inc,medium
```

### Retrieve Story

```bash
GET /api/story/:storyId
```

### Retrieve Batch Status

```bash
GET /api/story/batch/:batchId
```

### Retry Failed Stories

```bash
POST /api/story/batch/:batchId/retry
```

### Health Check

```bash
GET /health
GET /health/detailed
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `BASE_URL` | http://localhost:3000 | Base URL for generated links |
| `ANTHROPIC_API_KEY` | (required) | Claude API key for AI extraction |
| `ANTHROPIC_MODEL` | claude-sonnet-4-20250514 | Claude model to use |
| `GAMMA_API_KEY` | (optional) | Gamma API key for document generation |
| `GAMMA_DEFAULT_THEME_ID` | (optional) | Default theme if none specified |
| `MAX_RETRIES` | 3 | Max retry attempts for failed requests |
| `FETCH_TIMEOUT` | 30000 | Request timeout in ms |
| `MAX_CONCURRENT_WORKERS` | 5 | Parallel batch processing workers |
| `STORAGE_PATH` | ./stories | Path for generated HTML files |
| `DB_PATH` | ./data/stories.db | SQLite database path |

## Project Structure

```
├── src/
│   ├── config/              # Configuration
│   │   └── index.js         # Env vars, API keys
│   ├── middleware/          # Express middleware
│   │   ├── validation.js    # Request validation
│   │   └── errorHandler.js  # Error handling
│   ├── routes/              # API routes
│   │   ├── extract.js       # /api/extract endpoints
│   │   ├── story.js         # /api/story endpoints
│   │   └── health.js        # /health endpoints
│   ├── services/            # Core services
│   │   ├── extractionService.js    # URL fetching (axios)
│   │   ├── aiAgentService.js       # Claude AI agents
│   │   ├── gammaService.js         # Gamma API integration
│   │   ├── parsingService.js       # HTML parsing
│   │   ├── templateService.js      # HTML generation
│   │   ├── orchestrationService.js # Flow coordination
│   │   └── storageService.js       # SQLite & files
│   ├── utils/               # Helpers & utilities
│   │   ├── helpers.js       # ID generation, formatting
│   │   ├── errors.js        # Custom error types
│   │   └── logger.js        # Winston logging
│   └── index.js             # Entry point
├── stories/                 # Generated HTML (gitignored)
├── data/                    # SQLite database (gitignored)
├── Dockerfile
├── docker-compose.yml
├── render.yaml              # Render.com deployment config
└── package.json
```

## Key Services Explained

### aiAgentService.js
Three-agent pipeline using Claude:
1. **Extractor Agent**: Copies content verbatim from HTML (never summarizes)
2. **Reviewer Agent**: Validates extraction quality, scores 1-10
3. **Formatter Agent**: Generates clean HTML for PDF conversion

### gammaService.js
Gamma.app API integration:
- `generateDocument()`: Starts async document generation
- `pollGenerationStatus()`: Polls until complete (up to 5 min)
- `listThemes()`: Gets available themes from workspace
- Supports custom themes, logos, and multiple output formats

### orchestrationService.js
Coordinates the full pipeline:
1. Fetch URL content
2. Run AI extraction pipeline
3. Generate HTML files
4. Optionally generate Gamma document
5. Return all URLs and metadata

## Usage Examples

### cURL - Basic Extraction

```bash
curl -X POST https://raywebpagetocasestudy.onrender.com/api/extract/single \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/customer-story"}'
```

### cURL - With Gamma & Custom Theme

```bash
curl -X POST https://raywebpagetocasestudy.onrender.com/api/extract/single \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/customer-story",
    "options": {
      "useGamma": true,
      "gammaThemeId": "9vcj12yrqzldo65"
    }
  }'
```

### Node.js Example

```javascript
const axios = require('axios');

async function extractStory(url, themeId) {
  const response = await axios.post(
    'https://raywebpagetocasestudy.onrender.com/api/extract/single',
    {
      url,
      options: {
        useGamma: true,
        gammaThemeId: themeId
      }
    }
  );

  console.log('Gamma Doc:', response.data.gamma.gammaUrl);
  console.log('PDF:', response.data.gamma.pdfUrl);
  return response.data;
}

extractStory(
  'https://example.com/customer-story',
  '9vcj12yrqzldo65'
);
```

### Python Example

```python
import requests

def extract_story(url, theme_id=None):
    response = requests.post(
        'https://raywebpagetocasestudy.onrender.com/api/extract/single',
        json={
            'url': url,
            'options': {
                'useGamma': True,
                'gammaThemeId': theme_id
            }
        }
    )
    data = response.json()
    print(f"Gamma Doc: {data['gamma']['gammaUrl']}")
    print(f"PDF: {data['gamma']['pdfUrl']}")
    return data

extract_story(
    'https://example.com/customer-story',
    '9vcj12yrqzldo65'
)
```

## Multi-Tenant Usage (Future Architecture)

For serving multiple customers with different branding:

```javascript
// Customer config (would come from your database)
const customerConfig = {
  'acme-corp': {
    gammaThemeId: 'theme123',
    logoUrl: 'https://acme.com/logo.png'
  },
  'beta-inc': {
    gammaThemeId: 'theme456',
    logoUrl: 'https://beta.com/logo.png'
  }
};

// Process request with customer-specific branding
async function processForCustomer(url, customerId) {
  const config = customerConfig[customerId];

  return axios.post('/api/extract/single', {
    url,
    options: {
      useGamma: true,
      gammaThemeId: config.gammaThemeId,
      logoUrl: config.logoUrl
    }
  });
}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": "ERROR_TYPE",
  "message": "Human-readable description",
  "retryable": true
}
```

Error types:
- `INVALID_URL` - Invalid URL format
- `EXTRACTION_FAILED` - Unable to fetch/extract content
- `PARSE_ERROR` - HTML parsing failed
- `TIMEOUT` - Request timed out (retryable)
- `RATE_LIMITED` - Too many requests (retryable)
- `NOT_FOUND` - Story/batch not found
- `VALIDATION_ERROR` - Invalid request data
- `GAMMA_NOT_CONFIGURED` - Gamma API key missing

## Deployment

### Render.com (Current)

The app is deployed on Render.com with Docker:
- **URL**: https://raywebpagetocasestudy.onrender.com
- Auto-deploys from `main` branch
- Environment variables configured in Render dashboard

### Environment Variables on Render

Required:
- `ANTHROPIC_API_KEY`
- `BASE_URL` (set to your Render URL)

Optional:
- `GAMMA_API_KEY`
- `GAMMA_DEFAULT_THEME_ID`

## Known Limitations

1. **Free Tier Storage**: Render free tier doesn't persist files between deploys. Generated HTML files are lost on redeploy. Consider using persistent storage or S3 for production.

2. **Gamma Rate Limits**: Gamma API has rate limits. The service polls every 5 seconds with a 5-minute timeout.

3. **AI Extraction**: Works best on well-structured customer story pages. May struggle with heavily JavaScript-rendered content.

## License

MIT
