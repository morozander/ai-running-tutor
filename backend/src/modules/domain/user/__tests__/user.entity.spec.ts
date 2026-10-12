import {
  BusinessRuleViolationException,
  DomainValidationException,
} from '@core/exceptions/domain.exceptions';
import { User, UserRole } from '../entities/user.entity';

describe('User Entity', () => {
  const validUserParams = {
    id: 'cognito-sub-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  describe('create', () => {
    it('should create a valid user', () => {
      const user = User.create(validUserParams);

      expect(user.id).toBe('cognito-sub-123');
      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
      expect(user.role).toBe(UserRole.USER);
    });

    it('should normalize email to lowercase', () => {
      const user = User.create({
        ...validUserParams,
        email: 'TEST@EXAMPLE.COM',
      });

      expect(user.email).toBe('test@example.com');
    });

    it('should trim whitespace from email and names', () => {
      const user = User.create({
        id: 'cognito-sub-123',
        email: '  test@example.com  ',
        firstName: '  Test  ',
        lastName: '  User  ',
      });

      expect(user.email).toBe('test@example.com');
      expect(user.firstName).toBe('Test');
      expect(user.lastName).toBe('User');
    });

    it('should throw DomainValidationException for invalid email', () => {
      expect(() =>
        User.create({
          ...validUserParams,
          email: 'invalid-email',
        }),
      ).toThrow(DomainValidationException);
    });

    it('should throw DomainValidationException for empty first name', () => {
      expect(() =>
        User.create({
          ...validUserParams,
          firstName: '',
        }),
      ).toThrow(DomainValidationException);
      expect(() =>
        User.create({
          ...validUserParams,
          firstName: '   ',
        }),
      ).toThrow('First name is required');
    });

    it('should throw DomainValidationException for long first name', () => {
      const longName = 'A'.repeat(51);
      expect(() =>
        User.create({
          ...validUserParams,
          firstName: longName,
        }),
      ).toThrow('First name must not exceed 50 characters');
    });

    it('should throw DomainValidationException for long last name', () => {
      const longName = 'A'.repeat(51);
      expect(() =>
        User.create({
          ...validUserParams,
          lastName: longName,
        }),
      ).toThrow('Last name must not exceed 50 characters');
    });

    it('should accept custom role', () => {
      const user = User.create({
        ...validUserParams,
        role: UserRole.ADMIN,
      });

      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('should handle empty lastName', () => {
      const user = User.create({
        id: 'cognito-sub-123',
        email: 'test@example.com',
        firstName: 'Test',
      });

      expect(user.lastName).toBe('');
    });
  });

  describe('fullName', () => {
    it('should return full name', () => {
      const user = User.create(validUserParams);
      expect(user.fullName).toBe('Test User');
    });

    it('should handle empty lastName', () => {
      const user = User.create({
        id: 'cognito-sub-123',
        email: 'test@example.com',
        firstName: 'Test',
      });
      expect(user.fullName).toBe('Test');
    });
  });

  describe('updateProfile', () => {
    it('should update firstName', () => {
      const user = User.create(validUserParams);

      user.updateProfile({ firstName: 'NewFirst' });

      expect(user.firstName).toBe('NewFirst');
    });

    it('should update lastName', () => {
      const user = User.create(validUserParams);

      user.updateProfile({ lastName: 'NewLast' });

      expect(user.lastName).toBe('NewLast');
    });

    it('should update both names', () => {
      const user = User.create(validUserParams);

      user.updateProfile({ firstName: 'NewFirst', lastName: 'NewLast' });

      expect(user.firstName).toBe('NewFirst');
      expect(user.lastName).toBe('NewLast');
    });

    it('should throw for invalid firstName', () => {
      const user = User.create(validUserParams);

      expect(() => user.updateProfile({ firstName: '' })).toThrow(DomainValidationException);
    });

    it('should throw for long lastName', () => {
      const user = User.create(validUserParams);
      const longName = 'A'.repeat(51);

      expect(() => user.updateProfile({ lastName: longName })).toThrow(DomainValidationException);
    });
  });

  describe('changeEmail', () => {
    it('should change email', () => {
      const user = User.create(validUserParams);

      user.changeEmail('new@example.com');

      expect(user.email).toBe('new@example.com');
    });

    it('should normalize email to lowercase', () => {
      const user = User.create(validUserParams);

      user.changeEmail('NEW@EXAMPLE.COM');

      expect(user.email).toBe('new@example.com');
    });

    it('should throw for invalid email', () => {
      const user = User.create(validUserParams);

      expect(() => user.changeEmail('invalid')).toThrow(DomainValidationException);
    });
  });

  describe('recordLogin', () => {
    it('should record login timestamp', () => {
      const user = User.create(validUserParams);
      expect(user.lastLoginAt).toBeUndefined();

      user.recordLogin();

      expect(user.lastLoginAt).toBeInstanceOf(Date);
    });
  });

  describe('promoteToAdmin', () => {
    it('should promote user to admin', () => {
      const user = User.create(validUserParams);

      user.promoteToAdmin();

      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('should throw if already admin', () => {
      const user = User.create({
        ...validUserParams,
        role: UserRole.ADMIN,
      });

      expect(() => user.promoteToAdmin()).toThrow(BusinessRuleViolationException);
      expect(() => user.promoteToAdmin()).toThrow('User is already an admin');
    });
  });

  describe('demoteToUser', () => {
    it('should demote admin to User', () => {
      const user = User.create({
        ...validUserParams,
        role: UserRole.ADMIN,
      });

      user.demoteToUser();

      expect(user.role).toBe(UserRole.USER);
    });

    it('should throw if already an User', () => {
      const user = User.create(validUserParams);

      expect(() => user.demoteToUser()).toThrow(BusinessRuleViolationException);
      expect(() => user.demoteToUser()).toThrow('User is already an User');
    });
  });

  describe('canPerformAdminActions', () => {
    it('should return true for admin', () => {
      const user = User.create({
        ...validUserParams,
        role: UserRole.ADMIN,
      });
      expect(user.canPerformAdminActions()).toBe(true);
    });

    it('should return false for User', () => {
      const user = User.create(validUserParams);
      expect(user.canPerformAdminActions()).toBe(false);
    });
  });

  describe('isUser', () => {
    it('should return true for User', () => {
      const user = User.create(validUserParams);
      expect(user.isUser()).toBe(true);
    });

    it('should return false for admin', () => {
      const user = User.create({
        ...validUserParams,
        role: UserRole.ADMIN,
      });
      expect(user.isUser()).toBe(false);
    });
  });

  describe('soft delete', () => {
    it('should soft delete and restore', () => {
      const user = User.create(validUserParams);

      // Delete
      user.softDelete();
      expect(user.isDeleted()).toBe(true);
      expect(user.deletedAt).toBeInstanceOf(Date);

      // Restore
      user.restore();
      expect(user.isDeleted()).toBe(false);
      expect(user.deletedAt).toBeUndefined();
    });
  });
});
