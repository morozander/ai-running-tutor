import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { User } from './entities/user.entity';
import { GetUserQueryHandler } from './queries/get-user.query';
import { UserService } from './services/user.service';

const QueryHandlers = [GetUserQueryHandler];

/**
 * User Domain Module
 *
 * Contains the User entity, domain service, and CQRS handlers.
 * This module should NOT import other domain modules directly.
 */
@Module({
  imports: [CqrsModule, MikroOrmModule.forFeature([User])],
  providers: [UserService, ...QueryHandlers],
  exports: [UserService],
})
export class UserModule {}
