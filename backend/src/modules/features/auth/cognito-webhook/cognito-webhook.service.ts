import { EntityManager } from '@mikro-orm/postgresql';
import { User, UserRole } from '@modules/domain/user/entities/user.entity';
import { Injectable, Logger } from '@nestjs/common';
import type { UserConfirmedDto } from './dto/user-confirmed.dto';

/**
 * Service for handling Cognito webhook events
 */
@Injectable()
export class CognitoWebhookService {
  private readonly logger = new Logger(CognitoWebhookService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Handle user confirmation from Cognito PostConfirmation trigger
   *
   * Creates a new user in the database if they don't already exist.
   * Uses Cognito Sub as the user ID for consistency.
   */
  async handleUserConfirmed(dto: UserConfirmedDto): Promise<{ created: boolean }> {
    const { userId, email, firstName, lastName } = dto;

    // Check if user already exists (idempotency)
    const existingUser = await this.em.findOne(User, { id: userId });

    if (existingUser) {
      this.logger.log(`User ${userId} already exists, skipping creation`);
      return { created: false };
    }

    // Create new user using domain factory method
    const user = User.create({
      id: userId,
      email,
      firstName: firstName || 'User',
      lastName: lastName || '',
      role: UserRole.USER,
    });

    await this.em.persist(user).flush();

    this.logger.log(`User ${userId} created successfully`);
    return { created: true };
  }
}
