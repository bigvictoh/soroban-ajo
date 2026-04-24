import { AuthService } from '../../../services/authService';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('@prisma/client');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    authService = new AuthService(mockPrisma);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({
        id: '1',
        ...userData,
        password: 'hashedPassword'
      });

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith(userData.password, 10);
    });

    it('should throw error if user already exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1' });

      await expect(authService.register({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test'
      })).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'hashedPassword'
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('token');

      const result = await authService.login('test@example.com', 'password123');

      expect(result.token).toBe('token');
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('should throw error with invalid credentials', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login('test@example.com', 'wrong')).rejects.toThrow();
    });
  });
});
