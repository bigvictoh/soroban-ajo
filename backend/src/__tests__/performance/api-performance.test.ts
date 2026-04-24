import request from 'supertest';
import { app } from '../../app';

describe('Performance Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `perf${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Performance Test User'
      });

    authToken = response.body.token;
  });

  describe('API Response Times', () => {
    it('should respond to GET /api/groups within 200ms', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .get('/api/groups')
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .get('/api/groups')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(duration).toBeLessThan(1000);
    });

    it('should handle large payload efficiently', async () => {
      const largeData = {
        name: 'Test Group',
        description: 'A'.repeat(1000),
        members: Array(50).fill({ name: 'Member', email: 'test@example.com' })
      };

      const start = Date.now();
      
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send(largeData);

      const duration = Date.now() - start;

      expect(response.status).toBeLessThanOrEqual(201);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Database Query Performance', () => {
    it('should efficiently query with pagination', async () => {
      const start = Date.now();

      const response = await request(app)
        .get('/api/groups?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`);

      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(150);
    });
  });
});
