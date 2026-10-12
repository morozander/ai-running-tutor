import { EntityNotFoundException } from '@core/exceptions/domain.exceptions';
import { EntityManager } from '@mikro-orm/postgresql';
import { Test, type TestingModule } from '@nestjs/testing';
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';

describe('UserService', () => {
  let service: UserService;
  let mockEm: jest.Mocked<EntityManager>;

  const createMockUser = (overrides = {}) => {
    const user = User.create({
      id: 'cognito-sub-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      ...overrides,
    });
    return user;
  };

  beforeEach(async () => {
    mockEm = {
      findOne: jest.fn(),
      count: jest.fn(),
      findAndCount: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: EntityManager, useValue: mockEm }],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      mockEm.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('cognito-sub-123');

      expect(result).toBe(mockUser);
      expect(mockEm.findOne).toHaveBeenCalledWith(User, { id: 'cognito-sub-123' });
    });

    it('should throw EntityNotFoundException when user not found', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      const mockUser = createMockUser();
      mockEm.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toBe(mockUser);
      expect(mockEm.findOne).toHaveBeenCalledWith(User, { email: 'test@example.com' });
    });

    it('should return null when user not found by email', async () => {
      mockEm.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should normalize email to lowercase', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await service.findByEmail('TEST@EXAMPLE.COM');

      expect(mockEm.findOne).toHaveBeenCalledWith(User, { email: 'test@example.com' });
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email exists', async () => {
      mockEm.count.mockResolvedValue(1);

      const result = await service.isEmailTaken('existing@example.com');

      expect(result).toBe(true);
      expect(mockEm.count).toHaveBeenCalledWith(User, { email: 'existing@example.com' });
    });

    it('should return false when email does not exist', async () => {
      mockEm.count.mockResolvedValue(0);

      const result = await service.isEmailTaken('new@example.com');

      expect(result).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      mockEm.count.mockResolvedValue(0);

      await service.isEmailTaken('TEST@EXAMPLE.COM');

      expect(mockEm.count).toHaveBeenCalledWith(User, { email: 'test@example.com' });
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        createMockUser({ id: 'sub-1', email: 'user1@example.com' }),
        createMockUser({ id: 'sub-2', email: 'user2@example.com' }),
      ];
      mockEm.findAndCount.mockResolvedValue([mockUsers, 2]);

      const result = await service.findAll({ limit: 10, offset: 0 });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockEm.findAndCount).toHaveBeenCalledWith(
        User,
        {},
        { limit: 10, offset: 0, orderBy: { createdAt: 'DESC' } },
      );
    });

    it('should use default pagination values', async () => {
      mockEm.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll();

      expect(mockEm.findAndCount).toHaveBeenCalledWith(
        User,
        {},
        { limit: 20, offset: 0, orderBy: { createdAt: 'DESC' } },
      );
    });
  });
});
