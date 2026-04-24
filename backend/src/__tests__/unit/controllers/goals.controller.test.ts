import { Request, Response } from 'express';
import { GoalsController } from '../../../controllers/goalsController';

describe('GoalsController', () => {
  let goalsController: GoalsController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    goalsController = new GoalsController();
    mockRequest = {
      body: {},
      params: {},
      user: { id: 'user1' }
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
  });

  describe('createGoal', () => {
    it('should create a goal successfully', async () => {
      mockRequest.body = {
        title: 'Save for vacation',
        targetAmount: 5000,
        deadline: '2026-12-31'
      };

      await goalsController.createGoal(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 400 for invalid data', async () => {
      mockRequest.body = { title: '' };

      await goalsController.createGoal(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getGoals', () => {
    it('should retrieve user goals', async () => {
      await goalsController.getGoals(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });
});
