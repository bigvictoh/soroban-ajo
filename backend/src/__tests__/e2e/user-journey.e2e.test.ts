import request from 'supertest';
import { app } from '../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('E2E: Complete User Journey', () => {
  let authToken: string;
  let userId: string;
  let groupId: string;
  let goalId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should complete full user journey', async () => {
    // Step 1: Register
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: `e2e${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'E2E Test User'
      });

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.token;
    userId = registerResponse.body.user.id;

    // Step 2: Create a goal
    const goalResponse = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Save for house',
        targetAmount: 50000,
        deadline: '2027-12-31'
      });

    expect(goalResponse.status).toBe(201);
    goalId = goalResponse.body.id;

    // Step 3: Create a group
    const groupResponse = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Family Savings',
        description: 'Saving together',
        targetAmount: 20000
      });

    expect(groupResponse.status).toBe(201);
    groupId = groupResponse.body.id;

    // Step 4: Make a contribution
    const contributionResponse = await request(app)
      .post(`/api/groups/${groupId}/contributions`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 1000
      });

    expect(contributionResponse.status).toBe(201);

    // Step 5: Get user profile
    const profileResponse = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.id).toBe(userId);

    // Step 6: Get group details
    const groupDetailsResponse = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(groupDetailsResponse.status).toBe(200);
    expect(groupDetailsResponse.body.id).toBe(groupId);
  });
});
