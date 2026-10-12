import { CurrentUser, type CurrentUserPayload } from '@core/auth/decorators/current-user.decorator';
import { Roles } from '@core/auth/decorators/roles.decorator';
import { AuthGuard } from '@core/auth/guards/auth.guard';
import { RolesGuard } from '@core/auth/guards/roles.guard';
import { User, UserRole } from '@modules/domain/user/entities/user.entity';
import { UserService } from '@modules/domain/user/services/user.service';
import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  ConfirmationResponse,
  ConfirmRegistrationInput,
  RegisterUserInput,
  RegistrationResponse,
  ResendVerificationInput,
} from '../dto/register-user.input';
import { RegistrationService } from '../services/registration.service';

/**
 * GraphQL resolver for registration feature
 *
 * Handles user registration, email verification, and user queries.
 */
@Resolver(() => User)
export class RegistrationResolver {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly userService: UserService,
  ) {}

  /**
   * Register a new user with Cognito
   *
   * Public endpoint - no authentication required.
   * After registration, user must verify their email.
   */
  @Mutation(() => RegistrationResponse, {
    description: 'Register a new user account',
  })
  async registerUser(@Args('input') input: RegisterUserInput): Promise<RegistrationResponse> {
    return this.registrationService.registerUser(input);
  }

  /**
   * Confirm registration with verification code
   *
   * Public endpoint - no authentication required.
   */
  @Mutation(() => ConfirmationResponse, {
    description: 'Confirm registration with email verification code',
  })
  async confirmRegistration(
    @Args('input') input: ConfirmRegistrationInput,
  ): Promise<ConfirmationResponse> {
    return this.registrationService.confirmRegistration(input);
  }

  /**
   * Resend verification code
   *
   * Public endpoint - no authentication required.
   */
  @Mutation(() => ConfirmationResponse, {
    description: 'Resend email verification code',
  })
  async resendVerificationCode(
    @Args('input') input: ResendVerificationInput,
  ): Promise<ConfirmationResponse> {
    return this.registrationService.resendVerificationCode(input);
  }

  /**
   * Get current user profile
   *
   * Requires authentication.
   */
  @Query(() => User, {
    description: 'Get the currently authenticated user',
  })
  @UseGuards(AuthGuard)
  async me(@CurrentUser() currentUser: CurrentUserPayload): Promise<User> {
    return this.userService.findById(currentUser.userId);
  }

  /**
   * Get user by ID (admin only)
   *
   * Requires admin role.
   */
  @Query(() => User, {
    description: 'Get a user by ID (admin only)',
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async user(@Args('id', { type: () => ID }) id: string): Promise<User> {
    return this.userService.findById(id);
  }
}
