import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthTokens, LoginInput, LoginResponse, RefreshTokenInput } from '../dto/login.input';
import { LoginService } from '../services/login.service';

/**
 * GraphQL Resolver for authentication
 *
 * Provides login and token refresh mutations.
 * These endpoints are public (no auth required).
 */
@Resolver()
export class LoginResolver {
  constructor(private readonly loginService: LoginService) {}

  /**
   * Authenticate user with email and password
   *
   * Returns access token, ID token, and refresh token.
   */
  @Mutation(() => LoginResponse, {
    description: 'Authenticate user and get access tokens',
  })
  async login(@Args('input') input: LoginInput): Promise<LoginResponse> {
    return this.loginService.login(input);
  }

  /**
   * Refresh access token using refresh token
   *
   * Use this when the access token expires to get a new one
   * without requiring the user to log in again.
   */
  @Mutation(() => AuthTokens, {
    description: 'Refresh access token using refresh token',
  })
  async refreshToken(@Args('input') input: RefreshTokenInput): Promise<AuthTokens> {
    return this.loginService.refreshTokens(input);
  }
}
