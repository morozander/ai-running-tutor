import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Input DTO for user registration via Cognito
 */
@InputType()
export class RegisterUserInput {
  @Field()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @Field()
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;
}

/**
 * Input for email verification confirmation
 */
@InputType()
export class ConfirmRegistrationInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  code!: string;
}

/**
 * Input for resending verification code
 */
@InputType()
export class ResendVerificationInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

/**
 * Registration response
 */
@ObjectType()
export class RegistrationResponse {
  @Field()
  userId!: string;

  @Field()
  email!: string;

  @Field()
  confirmationRequired!: boolean;

  @Field()
  message!: string;

  static success(params: {
    userId?: string;
    email: string;
    confirmationRequired: boolean;
    message?: string;
  }): RegistrationResponse {
    const response = new RegistrationResponse();
    response.userId = params.userId || 'pending-confirmation';
    response.email = params.email;
    response.confirmationRequired = params.confirmationRequired;
    response.message = params.message || 'Registration successful';
    return response;
  }
}

/**
 * Confirmation response
 */
@ObjectType()
export class ConfirmationResponse {
  @Field()
  success!: boolean;

  @Field()
  message!: string;

  static success(message = 'Email verified successfully'): ConfirmationResponse {
    const response = new ConfirmationResponse();
    response.success = true;
    response.message = message;
    return response;
  }
}
