import request from 'supertest';
import { app } from '../../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Groups API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
    
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: `grouptest${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Group Test User'
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/groups', () => {
    it('should create a new group', async () => {
      const response = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Group',
          description: 'Test Description',
          targetAmount: 10000
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Group');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/groups')
        .send({
          name: 'Test Group',
          description: 'Test Description'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/groups/:id', () => {
    it('should retrieve group details', async () => {
      const createResponse = await request(app)
        .post('/api/groups')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Retrieve Test Group',
          description: 'Test'
        });

      const groupId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/groups/${groupId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(groupId);
    });
  });
});
