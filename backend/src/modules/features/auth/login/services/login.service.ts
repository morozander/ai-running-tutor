import { createHmac } from 'node:crypto';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  type InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoConfig } from '@config/cognito.config';
import { COGNITO_CONFIG_KEY } from '@config/cognito.config';
import { Injectable, Logger, type OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuthTokens,
  type LoginInput,
  LoginResponse,
  type RefreshTokenInput,
} from '../dto/login.input';

/**
 * Login Service
 *
 * Handles user authentication with AWS Cognito using USER_PASSWORD_AUTH flow.
 */
@Injectable()
export class LoginService implements OnModuleInit {
  private readonly logger = new Logger(LoginService.name);
  private client: CognitoIdentityProviderClient | null = null;
  private config: CognitoConfig | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.config = this.configService.get<CognitoConfig>(COGNITO_CONFIG_KEY) || null;

    if (!this.config?.userPoolId || !this.config?.clientId) {
      this.logger.warn('Cognito configuration incomplete. Login will not work.');
      return;
    }

    this.client = new CognitoIdentityProviderClient({
      region: this.config.region,
    });

    this.logger.log('Login service initialized');
  }

  /**
   * Compute SECRET_HASH for Cognito requests
   *
   * Required when the app client has a client secret configured.
   * Hash = Base64(HMAC_SHA256(username + clientId, clientSecret))
   */
  private computeSecretHash(username: string): string | undefined {
    if (!this.config?.clientSecret) {
      return undefined;
    }

    const message = username + this.config.clientId;
    const hmac = createHmac('sha256', this.config.clientSecret);
    hmac.update(message);
    return hmac.digest('base64');
  }

  /**
   * Authenticate user with email and password
   *
   * Uses USER_PASSWORD_AUTH flow which requires the app client to have
   * ALLOW_USER_PASSWORD_AUTH enabled in Cognito.
   */
  async login(input: LoginInput): Promise<LoginResponse> {
    if (!this.client || !this.config) {
      throw new UnauthorizedException('Authentication service not initialized');
    }

    try {
      const authParameters: Record<string, string> = {
        USERNAME: input.email,
        PASSWORD: input.password,
      };

      const secretHash = this.computeSecretHash(input.email);
      if (secretHash) {
        authParameters.SECRET_HASH = secretHash;
      }

      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.config.clientId,
        AuthParameters: authParameters,
      });

      const response: InitiateAuthCommandOutput = await this.client.send(command);

      if (!response.AuthenticationResult) {
        // This could happen if MFA is required or other challenges
        throw new UnauthorizedException('Authentication failed - additional verification required');
      }

      const { AccessToken, IdToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

      if (!AccessToken || !IdToken || !RefreshToken) {
        throw new UnauthorizedException('Authentication failed - incomplete token response');
      }

      // Decode ID token to get user info
      const userInfo = this.decodeIdToken(IdToken);

      const tokens = AuthTokens.create({
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: RefreshToken,
        expiresIn: ExpiresIn || 3600,
      });

      return LoginResponse.success({
        tokens,
        userId: userInfo.sub,
        email: userInfo.email,
      });
    } catch (error) {
      this.logger.error('Login failed', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle specific Cognito errors
      const errorName = (error as { name?: string }).name;
      switch (errorName) {
        case 'NotAuthorizedException':
          throw new UnauthorizedException('Invalid email or password');
        case 'UserNotFoundException':
          throw new UnauthorizedException('Invalid email or password');
        case 'UserNotConfirmedException':
          throw new UnauthorizedException('Please verify your email before logging in');
        case 'PasswordResetRequiredException':
          throw new UnauthorizedException('Password reset required');
        default:
          throw new UnauthorizedException('Authentication failed');
      }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(input: RefreshTokenInput): Promise<AuthTokens> {
    if (!this.client || !this.config) {
      throw new UnauthorizedException('Authentication service not initialized');
    }

    try {
      // For refresh token, we need to extract the username from the token
      // or use a stored username. Since we don't have it, we'll try without SECRET_HASH first
      // Note: If your app client requires SECRET_HASH for refresh, you'll need to
      // store the username or extract it from the refresh token
      const authParameters: Record<string, string> = {
        REFRESH_TOKEN: input.refreshToken,
      };

      // For refresh tokens with client secret, we need the username
      // The username can be extracted from the ID token or stored during login
      // For now, we'll skip SECRET_HASH for refresh if we don't have the username

      const command = new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: this.config.clientId,
        AuthParameters: authParameters,
      });

      const response: InitiateAuthCommandOutput = await this.client.send(command);

      if (!response.AuthenticationResult) {
        throw new UnauthorizedException('Token refresh failed');
      }

      const { AccessToken, IdToken, ExpiresIn } = response.AuthenticationResult;

      if (!AccessToken || !IdToken) {
        throw new UnauthorizedException('Token refresh failed - incomplete response');
      }

      return AuthTokens.create({
        accessToken: AccessToken,
        idToken: IdToken,
        // Refresh token is not returned on refresh, use the original
        refreshToken: input.refreshToken,
        expiresIn: ExpiresIn || 3600,
      });
    } catch (error) {
      this.logger.error('Token refresh failed', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorName = (error as { name?: string }).name;
      if (errorName === 'NotAuthorizedException') {
        throw new UnauthorizedException('Refresh token expired or invalid');
      }

      throw new UnauthorizedException('Token refresh failed');
    }
  }

  /**
   * Decode ID token to extract user information
   * Note: This is just decoding, not verifying - verification happens in AuthGuard
   */
  private decodeIdToken(idToken: string): { sub: string; email: string } {
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

      return {
        sub: payload.sub,
        email: payload.email,
      };
    } catch {
      throw new UnauthorizedException('Failed to decode token');
    }
  }
}
