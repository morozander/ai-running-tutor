import { UserRole } from '@modules/domain/user/entities/user.entity';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { CognitoService } from '../cognito/cognito.service';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that validates JWT tokens from AWS Cognito
 *
 * Extracts the token from the Authorization header and validates it.
 * On success, attaches the user payload to the request.
 * Auto-creates user in database on first login if not exists.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  // Set to true to disable auth (for development)
  private readonly isDisabled = false;

  constructor(
    private readonly cognitoService: CognitoService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isDisabled) {
      return true;
    }

    const request = this.getRequest(context);

    const authHeader = request.headers.authorization || request.headers.Authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = this.extractToken(authHeader);

    try {
      const cognitoPayload = await this.cognitoService.validateToken(token);

      // Validate role-based access if @Roles() decorator is used
      this.validateRoles(context, this.mapCognitoGroupToRole(cognitoPayload.groups));

      const payload: CurrentUserPayload = {
        userId: cognitoPayload.sub,

        email: cognitoPayload.email,
        role: this.mapCognitoGroupToRole(cognitoPayload.groups),
      };

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header
   */
  private extractToken(authHeader: string): string {
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Invalid authorization header format. Expected: Bearer <token>',
      );
    }

    return token;
  }

  /**
   * Map Cognito groups to application roles
   */
  private mapCognitoGroupToRole(groups: string[]): UserRole {
    // Check for admin group first
    if (groups.includes('Admin') || groups.includes('admin') || groups.includes('ADMIN')) {
      return UserRole.ADMIN;
    }

    // Default to user
    return UserRole.USER;
  }

  /**
   * Validate that user has required role
   */
  private validateRoles(context: ExecutionContext, userRole: UserRole): void {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return; // No role restriction
    }

    if (!requiredRoles.includes(userRole)) {
      throw new UnauthorizedException('Insufficient permissions');
    }
  }

  /**
   * Get request object from context (handles both REST and GraphQL)
   */
  private getRequest(context: ExecutionContext) {
    const type = context.getType<string>();

    if (type === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      return ctx.getContext().req;
    }

    // REST context
    return context.switchToHttp().getRequest();
  }
}
