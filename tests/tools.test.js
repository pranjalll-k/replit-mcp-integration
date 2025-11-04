const request = require('supertest');
const express = require('express');
const toolsRouter = require('../src/routes/tools');

const app = express();
app.use(express.json());
app.use('/', toolsRouter);

describe('Tools API', () => {
  const validHeaders = {
    'Authorization': 'Bearer test-token'
  };

  describe('GET /tools', () => {
    it('should return tools definition', async () => {
      const response = await request(app)
        .get('/tools')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(5);
      expect(response.body.data[0].name).toBe('createReplitProject');
    });
  });

  describe('POST /tools/:toolName', () => {
    it('should return 401 without Replit token', async () => {
      const response = await request(app)
        .post('/tools/createReplitProject')
        .send({ title: 'Test', language: 'nodejs' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for missing required parameters', async () => {
      const response = await request(app)
        .post('/tools/createReplitProject')
        .set(validHeaders)
        .send({ title: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Missing required parameter: language');
    });

    it('should return 400 for unknown tool', async () => {
      const response = await request(app)
        .post('/tools/unknownTool')
        .set(validHeaders)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Unknown tool: unknownTool');
    });
  });
});