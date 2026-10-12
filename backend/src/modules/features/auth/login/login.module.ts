import { Module } from '@nestjs/common';
import { LoginResolver } from './resolvers/login.resolver';
import { LoginService } from './services/login.service';

/**
 * Login Feature Module
 *
 * Handles user authentication with AWS Cognito.
 * Provides GraphQL endpoints for login and token refresh.
 */
@Module({
  providers: [LoginService, LoginResolver],
  exports: [LoginService],
})
export class LoginModule {}
