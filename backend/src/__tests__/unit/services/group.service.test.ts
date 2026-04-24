import { GroupService } from '../../../services/groupService';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client');

describe('GroupService', () => {
  let groupService: GroupService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    groupService = new GroupService(mockPrisma);
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'Test Description',
        creatorId: 'user1'
      };

      (mockPrisma.group.create as jest.Mock).mockResolvedValue({
        id: 'group1',
        ...groupData
      });

      const result = await groupService.createGroup(groupData);

      expect(result.id).toBe('group1');
      expect(result.name).toBe(groupData.name);
    });
  });

  describe('getGroup', () => {
    it('should retrieve group by id', async () => {
      const group = {
        id: 'group1',
        name: 'Test Group'
      };

      (mockPrisma.group.findUnique as jest.Mock).mockResolvedValue(group);

      const result = await groupService.getGroup('group1');

      expect(result).toEqual(group);
    });

    it('should return null for non-existent group', async () => {
      (mockPrisma.group.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await groupService.getGroup('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addMember', () => {
    it('should add member to group', async () => {
      (mockPrisma.groupMember.create as jest.Mock).mockResolvedValue({
        groupId: 'group1',
        userId: 'user1',
        role: 'MEMBER'
      });

      const result = await groupService.addMember('group1', 'user1');

      expect(result.userId).toBe('user1');
    });
  });
});
