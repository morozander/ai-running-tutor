import { UserRole } from '@modules/domain/user/entities/user.entity';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { CurrentUserPayload } from '../decorators/current-user.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that checks if the current user has the required roles
 *
 * Use with @Roles() decorator on resolvers or handlers.
 * If no roles are specified, access is granted.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Handle both GraphQL and REST contexts
    const type = context.getType<string>();
    let request: { user?: CurrentUserPayload };

    if (type === 'graphql') {
      const ctx = GqlExecutionContext.create(context);
      request = ctx.getContext().req;
    } else {
      request = context.switchToHttp().getRequest();
    }

    const user = request.user as CurrentUserPayload | undefined;

    // No user - deny access
    if (!user) {
      return false;
    }

    // Check if user has any of the required roles
    return requiredRoles.some((role) => user.role === role);
  }
}
