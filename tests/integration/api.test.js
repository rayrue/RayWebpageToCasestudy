const request = require('supertest');
const app = require('../../src/index');

describe('API Integration Tests', () => {
  describe('GET /', () => {
    it('should return service info', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Customer Story Extraction Service');
      expect(response.body.endpoints).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
      expect(response.body.services.database).toBe('connected');
    });
  });

  describe('POST /api/extract/single', () => {
    it('should reject missing URL', async () => {
      const response = await request(app)
        .post('/api/extract/single')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid URL format', async () => {
      const response = await request(app)
        .post('/api/extract/single')
        .send({ url: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('INVALID_URL');
    });

    it('should accept valid URL format', async () => {
      // This test will attempt a real fetch, so we use a timeout
      const response = await request(app)
        .post('/api/extract/single')
        .send({
          url: 'https://httpbin.org/html',
          options: { timeout: 10000 }
        })
        .timeout(15000);

      // The request should complete (success or failure due to content)
      expect(response.body).toHaveProperty('success');
    }, 20000);
  });

  describe('POST /api/extract/batch', () => {
    it('should reject missing file', async () => {
      const response = await request(app)
        .post('/api/extract/batch');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/story/:storyId', () => {
    it('should return 400 for invalid story ID format', async () => {
      const response = await request(app)
        .get('/api/story/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent story', async () => {
      const response = await request(app)
        .get('/api/story/story_000000000000');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NOT_FOUND');
    });
  });
});
