import { UserModule } from '@modules/domain/user/user.module';
import { Module } from '@nestjs/common';
import { RegistrationResolver } from './resolvers/registration.resolver';
import { RegistrationService } from './services/registration.service';

/**
 * Registration Feature Module
 *
 * Handles user registration with AWS Cognito.
 * Provides GraphQL endpoints for:
 * - User registration
 * - Email verification
 * - Resend verification code
 */
@Module({
  imports: [UserModule],
  providers: [RegistrationService, RegistrationResolver],
  exports: [RegistrationService],
})
export class RegistrationModule {}
