import { createHmac } from 'node:crypto';
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
  type SignUpCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import type { CognitoConfig } from '@config/cognito.config';
import { COGNITO_CONFIG_KEY } from '@config/cognito.config';
import { SendGridService } from '@core/sendgrid/service/sendgrid.service';
import { EmailTemplateType } from '@core/sendgrid/template/sendgrid.email-template';
import { BadRequestException, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Span } from 'nestjs-otel';
import {
  ConfirmationResponse,
  type ConfirmRegistrationInput,
  type RegisterUserInput,
  RegistrationResponse,
  type ResendVerificationInput,
} from '../dto/register-user.input';

/**
 * Registration service using AWS Cognito
 *
 * Handles user sign-up, email verification, and confirmation.
 */
@Injectable()
export class RegistrationService implements OnModuleInit {
  private readonly logger = new Logger(RegistrationService.name);
  private client: CognitoIdentityProviderClient | null = null;
  private config: CognitoConfig | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly sendGridService: SendGridService,
  ) {}

  onModuleInit() {
    this.config = this.configService.get<CognitoConfig>(COGNITO_CONFIG_KEY) || null;

    if (!this.config?.userPoolId || !this.config?.clientId) {
      this.logger.warn('Cognito configuration incomplete. Registration will not work.');
      return;
    }

    this.client = new CognitoIdentityProviderClient({
      region: this.config.region,
    });

    this.logger.log('Registration service initialized');
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
   * Register a new user with Cognito
   *
   * Creates the user in Cognito and sends a verification email.
   * The user must confirm their email before they can log in.
   */
  @Span('registration.registerUser')
  async registerUser(input: RegisterUserInput): Promise<RegistrationResponse> {
    if (!this.client || !this.config) {
      throw new BadRequestException('Registration service not initialized');
    }

    this.logger.log(`Processing registration for ${input.email}`);

    try {
      const command = new SignUpCommand({
        ClientId: this.config.clientId,
        Username: input.email,
        Password: input.password,
        SecretHash: this.computeSecretHash(input.email),
        UserAttributes: [
          { Name: 'email', Value: input.email },
          { Name: 'given_name', Value: input.firstName },
          { Name: 'family_name', Value: input.lastName || '' },
        ],
      });

      const response: SignUpCommandOutput = await this.client.send(command);

      this.logger.log(
        `User registered: ${input.email}, confirmation required: ${!response.UserConfirmed}`,
      );

      if (this.sendGridService.isConfigured()) {
        try {
          await this.sendGridService.sendEmailByTemplate(input.email, EmailTemplateType.WELCOME, {
            userName: input.firstName,
          });
        } catch (error) {
          this.logger.error('Failed to send welcome email', {
            error: error.message,
            email: input.email,
          });
        }
      }

      return RegistrationResponse.success({
        userId: response.UserSub,
        email: input.email,
        confirmationRequired: !response.UserConfirmed,
        message: response.UserConfirmed
          ? 'Registration successful'
          : 'Registration successful. Please check your email for verification code.',
      });
    } catch (error) {
      this.logger.error('Registration failed', error);

      const errorName = (error as { name?: string }).name;
      switch (errorName) {
        case 'UsernameExistsException':
          throw new BadRequestException('An account with this email already exists');
        case 'InvalidPasswordException':
          throw new BadRequestException(
            'Password does not meet requirements. Must contain uppercase, lowercase, number, and be at least 8 characters.',
          );
        case 'InvalidParameterException':
          throw new BadRequestException('Invalid registration parameters');
        default:
          throw new BadRequestException('Registration failed. Please try again.');
      }
    }
  }

  /**
   * Confirm user registration with verification code
   *
   * Called after user receives the verification code via email.
   */
  @Span('registration.confirmRegistration')
  async confirmRegistration(input: ConfirmRegistrationInput): Promise<ConfirmationResponse> {
    if (!this.client || !this.config) {
      throw new BadRequestException('Registration service not initialized');
    }

    this.logger.log(`Confirming registration for ${input.email}`);

    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.config.clientId,
        Username: input.email,
        ConfirmationCode: input.code,
        SecretHash: this.computeSecretHash(input.email),
      });

      await this.client.send(command);

      this.logger.log(`Registration confirmed for ${input.email}`);

      return ConfirmationResponse.success('Email verified successfully. You can now log in.');
    } catch (error) {
      this.logger.error('Confirmation failed', error);

      const errorName = (error as { name?: string }).name;
      switch (errorName) {
        case 'CodeMismatchException':
          throw new BadRequestException('Invalid verification code');
        case 'ExpiredCodeException':
          throw new BadRequestException('Verification code has expired. Please request a new one.');
        case 'UserNotFoundException':
          throw new BadRequestException('User not found');
        case 'NotAuthorizedException':
          throw new BadRequestException('User is already confirmed');
        default:
          throw new BadRequestException('Confirmation failed. Please try again.');
      }
    }
  }

  /**
   * Resend verification code to user's email
   */
  @Span('registration.resendVerification')
  async resendVerificationCode(input: ResendVerificationInput): Promise<ConfirmationResponse> {
    if (!this.client || !this.config) {
      throw new BadRequestException('Registration service not initialized');
    }

    this.logger.log(`Resending verification code to ${input.email}`);

    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.config.clientId,
        Username: input.email,
        SecretHash: this.computeSecretHash(input.email),
      });

      await this.client.send(command);

      this.logger.log(`Verification code resent to ${input.email}`);

      return ConfirmationResponse.success('Verification code sent. Please check your email.');
    } catch (error) {
      this.logger.error('Resend verification failed', error);

      const errorName = (error as { name?: string }).name;
      switch (errorName) {
        case 'UserNotFoundException':
          throw new BadRequestException('User not found');
        case 'InvalidParameterException':
          throw new BadRequestException('User is already confirmed');
        case 'LimitExceededException':
          throw new BadRequestException('Too many requests. Please wait before trying again.');
        default:
          throw new BadRequestException('Failed to resend verification code. Please try again.');
      }
    }
  }
}
