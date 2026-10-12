import {
  BusinessRuleViolationException,
  DomainValidationException,
} from '@core/exceptions/domain.exceptions';
import { Entity, Enum, type Opt, Property } from '@mikro-orm/core';
import { Field, GraphQLISODateTime, ObjectType, registerEnumType } from '@nestjs/graphql';
import { BaseEntity } from '@shared/database/base.entity';

/**
 * User roles for RBAC
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

registerEnumType(UserRole, {
  name: 'UserRole',
  description: 'User role for access control',
});

/**
 * User entity with Rich Domain Model
 *
 * The user ID is the Cognito Sub (subject identifier).
 * This ensures consistency between Cognito and the database.
 *
 * Note: Column names are auto-converted to snake_case by UnderscoreNamingStrategy
 * (e.g., firstName -> first_name)
 */
@ObjectType()
@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Field()
  @Property({ unique: true })
  email!: string;

  @Field()
  @Property()
  firstName!: string;

  @Field()
  @Property()
  lastName!: string;

  @Field(() => UserRole)
  @Enum({ items: () => UserRole })
  role: UserRole & Opt = UserRole.USER;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @Property({ nullable: true })
  lastLoginAt?: Date;

  // Relations - will be populated when Task entity is created
  // @OneToMany(() => Task, task => task.assignee)
  // assignedTasks = new Collection<Task>(this);

  // @OneToMany(() => Task, task => task.createdBy)
  // createdTasks = new Collection<Task>(this);

  // ============================================
  // COMPUTED FIELDS
  // ============================================

  @Field()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  // ============================================
  // DOMAIN LOGIC - Business rules live here
  // ============================================

  /**
   * Validate email format
   */
  private static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainValidationException(`Invalid email format: ${email}`);
    }
  }

  /**
   * Validate first name
   */
  private static validateFirstName(firstName: string): void {
    if (!firstName || firstName.trim().length < 1) {
      throw new DomainValidationException('First name is required');
    }
    if (firstName.length > 50) {
      throw new DomainValidationException('First name must not exceed 50 characters');
    }
  }

  /**
   * Validate last name
   */
  private static validateLastName(lastName: string): void {
    if (lastName.length > 50) {
      throw new DomainValidationException('Last name must not exceed 50 characters');
    }
  }

  /**
   * Factory method to create a new user
   *
   * @param id - Cognito Sub (subject identifier) - used as the user ID
   */
  static create(params: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    role?: UserRole;
  }): User {
    // Normalize inputs first
    const normalizedEmail = params.email.toLowerCase().trim();
    const normalizedFirstName = params.firstName.trim();
    const normalizedLastName = (params.lastName || '').trim();

    // Then validate
    User.validateEmail(normalizedEmail);
    User.validateFirstName(normalizedFirstName);
    User.validateLastName(normalizedLastName);

    const user = new User();
    user.id = params.id; // Cognito Sub
    user.email = normalizedEmail;
    user.firstName = normalizedFirstName;
    user.lastName = normalizedLastName;
    user.role = params.role || UserRole.USER;

    return user;
  }

  /**
   * Update user profile
   */
  updateProfile(params: { firstName?: string; lastName?: string }): void {
    if (params.firstName !== undefined) {
      User.validateFirstName(params.firstName);
      this.firstName = params.firstName.trim();
    }
    if (params.lastName !== undefined) {
      User.validateLastName(params.lastName);
      this.lastName = params.lastName.trim();
    }
  }

  /**
   * Change user email (requires re-verification)
   */
  changeEmail(newEmail: string): void {
    const normalizedEmail = newEmail.toLowerCase().trim();
    User.validateEmail(normalizedEmail);
    this.email = normalizedEmail;
  }

  /**
   * Record a login event
   */
  recordLogin(): void {
    this.lastLoginAt = new Date();
  }

  /**
   * Promote user to admin
   */
  promoteToAdmin(): void {
    if (this.role === UserRole.ADMIN) {
      throw new BusinessRuleViolationException('User is already an admin');
    }
    this.role = UserRole.ADMIN;
  }

  /**
   * Demote admin to User
   */
  demoteToUser(): void {
    if (this.role === UserRole.USER) {
      throw new BusinessRuleViolationException('User is already an User');
    }
    this.role = UserRole.USER;
  }

  /**
   * Check if user can perform admin actions
   */
  canPerformAdminActions(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Check if user is an User
   */
  isUser(): boolean {
    return this.role === UserRole.USER;
  }

  /**
   * Soft delete the entity
   */
  softDelete(): void {
    this.deletedAt = new Date();
  }

  /**
   * Restore a soft-deleted entity
   */
  restore(): void {
    this.deletedAt = undefined;
  }

  /**
   * Check if entity is soft-deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== undefined;
  }
}
