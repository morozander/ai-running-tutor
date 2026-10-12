import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';

/**
 * Aggregates all domain modules
 *
 * Domain modules contain:
 * - Entities with business logic (Rich Domain Model)
 * - Domain services for complex operations
 * - CQRS handlers for cross-module communication
 *
 * IMPORTANT: Domain modules MUST NOT import each other directly.
 * Use CQRS (Command/Query Bus) for cross-domain communication.
 */
@Module({
  imports: [UserModule],
  exports: [UserModule],
})
export class DomainModules {}
