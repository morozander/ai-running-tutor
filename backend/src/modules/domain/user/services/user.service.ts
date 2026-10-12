import { EntityNotFoundException } from '@core/exceptions/domain.exceptions';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';

/**
 * User domain service
 *
 * Read-only operations. Mutations should be handled in feature modules
 * with proper transaction management.
 */
@Injectable()
export class UserService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.em.findOne(User, { id });
    if (!user) {
      throw new EntityNotFoundException('User', id);
    }
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.em.findOne(User, { email: email.toLowerCase() });
  }

  /**
   * Check if email is already taken
   */
  async isEmailTaken(email: string): Promise<boolean> {
    const count = await this.em.count(User, { email: email.toLowerCase() });
    return count > 0;
  }

  /**
   * Get all users (with pagination)
   */
  async findAll(options: { limit?: number; offset?: number } = {}): Promise<{
    users: User[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options;

    const [users, total] = await this.em.findAndCount(
      User,
      {},
      {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    return { users, total };
  }
}
