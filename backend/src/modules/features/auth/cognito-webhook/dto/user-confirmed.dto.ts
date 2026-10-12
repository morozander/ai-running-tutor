import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for Cognito PostConfirmation webhook payload
 */
export class UserConfirmedDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}
