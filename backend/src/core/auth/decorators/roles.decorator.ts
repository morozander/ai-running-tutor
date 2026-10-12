import type { UserRole } from "@modules/domain/user/entities/user.entity";
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Decorator to specify required roles for a resolver or handler
 *
 * @example
 * @Roles(UserRole.ADMIN)
 * @Query(() => [User])
 * async getAllUsers() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
