import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Input for user login
 */
@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}

/**
 * Input for refreshing tokens
 */
@InputType()
export class RefreshTokenInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

/**
 * Authentication tokens response
 */
@ObjectType()
export class AuthTokens {
  @Field()
  accessToken!: string;

  @Field()
  idToken!: string;

  @Field()
  refreshToken!: string;

  @Field()
  expiresIn!: number;

  @Field()
  tokenType!: string;

  static create(params: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
  }): AuthTokens {
    const tokens = new AuthTokens();
    tokens.accessToken = params.accessToken;
    tokens.idToken = params.idToken;
    tokens.refreshToken = params.refreshToken;
    tokens.expiresIn = params.expiresIn;
    tokens.tokenType = 'Bearer';
    return tokens;
  }
}

/**
 * Login response with tokens and user info
 */
@ObjectType()
export class LoginResponse {
  @Field(() => AuthTokens)
  tokens!: AuthTokens;

  @Field()
  userId!: string;

  @Field()
  email!: string;

  @Field()
  message!: string;

  static success(params: { tokens: AuthTokens; userId: string; email: string }): LoginResponse {
    const response = new LoginResponse();
    response.tokens = params.tokens;
    response.userId = params.userId;
    response.email = params.email;
    response.message = 'Login successful';
    return response;
  }
}
