import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface CurrentUserPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Decorator to extract the current user from the GraphQL request context
 *
 * @example
 * @Query(() => User)
 * async me(@CurrentUser() user: CurrentUserPayload) {
 *   return this.userService.findById(user.userId);
 * }
 *
 * @example
 * // Extract specific field
 * @Query(() => String)
 * async myEmail(@CurrentUser('email') email: string) {
 *   return email;
 * }
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof CurrentUserPayload | undefined,
    context: ExecutionContext,
  ): CurrentUserPayload | CurrentUserPayload[keyof CurrentUserPayload] => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    const user = request.user as CurrentUserPayload;

    return data ? user?.[data] : user;
  },
);
