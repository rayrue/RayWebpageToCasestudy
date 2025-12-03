# Customer Story Extraction Microservice

A Node.js microservice that extracts customer stories from web URLs and generates optimized HTML pages for URL Box (screenshot-to-PDF conversion service).

## Features

- Extract content from single URLs or batch CSV files
- Intelligent content extraction with noise removal
- Generate PDF-ready HTML optimized for URL Box screenshots
- SQLite storage with file-based HTML output
- Rate limiting and retry logic with exponential backoff
- Docker support for easy deployment

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone or navigate to the project
cd "URL Extract"

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start the server
npm run dev
```

The server will start on `http://localhost:3000`.

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t customer-story-service .
docker run -p 3000:3000 customer-story-service
```

## API Reference

### Extract Single URL

```bash
POST /api/extract/single
Content-Type: application/json

{
  "url": "https://example.com/customer-story",
  "options": {
    "timeout": 30000,
    "maxRetries": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "storyId": "story_6a4f2c8b9e1d",
  "url": "https://example.com/customer-story",
  "extractedAt": "2025-12-03T12:01:58Z",
  "content": {
    "title": "Company X Improves Performance 100X",
    "textOnly": "Full extracted story as plain text...",
    "wordCount": 2847,
    "estimatedReadTime": "12 minutes"
  },
  "htmlPageUrl": "http://localhost:3000/stories/story_6a4f2c8b9e1d/index.html",
  "pdfReadyUrl": "http://localhost:3000/stories/story_6a4f2c8b9e1d/pdf-ready.html",
  "urlBoxScreenshotLink": null
}
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
https://example.com/story3,Gamma Ltd,low
```

**Response:**
```json
{
  "success": true,
  "batchId": "batch_8f2k9p3l4q7w",
  "totalUrls": 3,
  "createdAt": "2025-12-03T12:01:58Z",
  "results": [...],
  "batchDashboardUrl": "http://localhost:3000/batches/batch_8f2k9p3l4q7w"
}
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

## Static Files

Generated HTML files are served at:

- **Standard HTML:** `GET /stories/:storyId/index.html`
- **PDF-Ready HTML:** `GET /stories/:storyId/pdf-ready.html`
- **Batch Dashboard:** `GET /batches/:batchId`

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `BASE_URL` | http://localhost:3000 | Base URL for generated links |
| `MAX_RETRIES` | 3 | Max retry attempts for failed requests |
| `FETCH_TIMEOUT` | 30000 | Request timeout in ms |
| `MAX_CONCURRENT_WORKERS` | 5 | Parallel batch processing workers |
| `STORAGE_PATH` | ./stories | Path for generated HTML files |
| `DB_PATH` | ./data/stories.db | SQLite database path |
| `URLBOX_API_KEY` | (empty) | URL Box API key (optional) |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Max requests per window |

## Project Structure

```
├── src/
│   ├── config/          # Configuration
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Core services
│   │   ├── extractionService.js   # URL fetching
│   │   ├── parsingService.js      # HTML parsing
│   │   ├── templateService.js     # HTML generation
│   │   ├── orchestrationService.js # Flow coordination
│   │   └── storageService.js      # Database & files
│   ├── utils/           # Helpers & utilities
│   └── index.js         # Entry point
├── tests/               # Test files
├── stories/             # Generated HTML (gitignored)
├── data/                # SQLite database (gitignored)
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

## Usage Examples

### cURL Examples

**Extract Single URL:**
```bash
curl -X POST http://localhost:3000/api/extract/single \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/customer-story"}'
```

**Upload CSV Batch:**
```bash
curl -X POST http://localhost:3000/api/extract/batch \
  -F "file=@urls.csv"
```

**Get Story:**
```bash
curl http://localhost:3000/api/story/story_6a4f2c8b9e1d
```

### Node.js Example

```javascript
const axios = require('axios');

async function extractStory(url) {
  const response = await axios.post('http://localhost:3000/api/extract/single', {
    url,
    options: { timeout: 30000 }
  });

  console.log('Story ID:', response.data.storyId);
  console.log('PDF Ready URL:', response.data.pdfReadyUrl);
  return response.data;
}

extractStory('https://example.com/customer-story');
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

## License

MIT
