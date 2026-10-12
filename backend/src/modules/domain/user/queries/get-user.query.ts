import type { IQuery, IQueryHandler } from '@nestjs/cqrs';
import { QueryHandler } from '@nestjs/cqrs';
import type { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';

/**
 * Query to get a user by ID
 *
 * Use this for cross-module communication via the QueryBus.
 */
export class GetUserQuery implements IQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetUserQuery)
export class GetUserQueryHandler implements IQueryHandler<GetUserQuery, User> {
  constructor(private readonly userService: UserService) {}

  async execute(query: GetUserQuery): Promise<User> {
    return this.userService.findById(query.userId);
  }
}
