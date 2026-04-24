import request from 'supertest';
import { app } from '../../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'Password123!',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('email');
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate${Date.now()}@example.com`;
      
      await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          name: 'Test User'
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password123!',
          name: 'Test User 2'
        });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const email = `login${Date.now()}@example.com`;
      const password = 'Password123!';

      await request(app)
        .post('/api/auth/register')
        .send({ email, password, name: 'Test User' });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });
});
