# Cookbook

A practical guide for common development tasks in this boilerplate.

## Table of Contents

1. [How to Add a New Domain](#how-to-add-a-new-domain)
2. [How to Add a New Feature](#how-to-add-a-new-feature)
3. [How to Trigger a Cross-Module Action](#how-to-trigger-a-cross-module-action)
4. [How to Add a New GraphQL Query/Mutation](#how-to-add-a-new-graphql-querymutation)
5. [How to Add Role-Based Access Control](#how-to-add-role-based-access-control)
6. [How to Create a Database Migration](#how-to-create-a-database-migration)
7. [How to Add a New Configuration](#how-to-add-a-new-configuration)
8. [How to Handle Domain Exceptions](#how-to-handle-domain-exceptions)

---

## How to Add a New Domain

### Option A: Use the generator script (recommended)

```bash
pnpm run create:domain product
```

This creates:
- `src/modules/domain/product/entities/product.entity.ts`
- `src/modules/domain/product/services/product.service.ts`
- `src/modules/domain/product/product.module.ts`
- `src/modules/domain/product/__tests__/product.entity.spec.ts`

Then register in `src/modules/domain/domain.modules.ts`.

### Option B: Manual creation

### Step 1: Create the folder structure

```bash
mkdir -p src/modules/domain/product/{entities,services,queries,__tests__}
```

### Step 2: Create the entity

```typescript
// src/modules/domain/product/entities/product.entity.ts
import { Entity, Property, Enum } from '@mikro-orm/core';
import { ObjectType, Field, Float } from '@nestjs/graphql';
import { BaseEntity } from '@shared/database/base.entity';
import { DomainValidationException } from '@core/exceptions/domain.exceptions';

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

@ObjectType()
@Entity({ tableName: 'products' })
export class Product extends BaseEntity {
  @Field()
  @Property()
  name!: string;

  @Field(() => Float)
  @Property({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Field(() => ProductStatus)
  @Enum({ items: () => ProductStatus })
  status: ProductStatus = ProductStatus.DRAFT;

  // Factory method
  static create(params: { name: string; price: number }): Product {
    if (params.price < 0) {
      throw new DomainValidationException('Price cannot be negative');
    }

    const product = new Product();
    product.name = params.name;
    product.price = params.price;
    product.status = ProductStatus.DRAFT;
    return product;
  }

  // Domain method
  publish(): void {
    if (this.status !== ProductStatus.DRAFT) {
      throw new DomainValidationException('Only draft products can be published');
    }
    this.status = ProductStatus.ACTIVE;
  }
}
```

### Step 3: Create the domain service (read-only)

Domain services should only contain **read operations**. Mutations (create, update, delete) should be handled in feature modules with proper transaction management.

```typescript
// src/modules/domain/product/services/product.service.ts
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Product } from '../entities/product.entity';
import { EntityNotFoundException } from '@core/exceptions/domain.exceptions';

@Injectable()
export class ProductService {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Product> {
    const product = await this.em.findOne(Product, { id, deletedAt: null });
    if (!product) {
      throw new EntityNotFoundException('Product', id);
    }
    return product;
  }

  async findAll(options: { limit?: number; offset?: number } = {}): Promise<{
    items: Product[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options;
    const [items, total] = await this.em.findAndCount(
      Product,
      { deletedAt: null },
      { limit, offset, orderBy: { createdAt: 'DESC' } },
    );
    return { items, total };
  }
}
```

### Step 4: Create the module

```typescript
// src/modules/domain/product/product.module.ts
import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from './entities/product.entity';
import { ProductService } from './services/product.service';

@Module({
  imports: [MikroOrmModule.forFeature([Product])],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
```

### Step 5: Register in DomainModules

```typescript
// src/modules/domain/domain.modules.ts
import { ProductModule } from './product/product.module';

@Module({
  imports: [UserModule, ProductModule],
  exports: [UserModule, ProductModule],
})
export class DomainModules {}
```

### Step 6: Create migration

```bash
pnpm run db:migrate:create -- --name=create-products-table
```

---

## How to Add a New Feature

Features handle **mutations and orchestration**. They use domain services for reads and `EntityManager` directly for writes.

### Step 1: Create the folder structure

```bash
mkdir -p src/modules/features/catalog/{dto,services,resolvers,__tests__}
```

### Step 2: Create DTOs

```typescript
// src/modules/features/catalog/dto/create-product.input.ts
import { InputType, Field, Float } from '@nestjs/graphql';
import { IsString, IsNumber, Min, MinLength } from 'class-validator';

@InputType()
export class CreateProductInput {
  @Field()
  @IsString()
  @MinLength(2)
  name!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price!: number;
}
```

### Step 3: Create the feature service (handles mutations)

```typescript
// src/modules/features/catalog/services/catalog.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Product } from '@modules/domain/product/entities/product.entity';
import { ProductService } from '@modules/domain/product/services/product.service';
import { CreateProductInput } from '../dto/create-product.input';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly em: EntityManager,           // For writes
    private readonly productService: ProductService, // For reads
  ) {}

  async createProduct(input: CreateProductInput): Promise<Product> {
    this.logger.log(`Creating product: ${input.name}`);

    // Use entity factory method
    const product = Product.create({
      name: input.name,
      price: input.price,
    });

    // Persist with EntityManager
    await this.em.persist(user).flush();

    this.logger.log(`Product created: ${product.id}`);
    return product;
  }

  async findById(id: string): Promise<Product> {
    return this.productService.findById(id);
  }
}
```

### Step 4: Create the resolver

```typescript
// src/modules/features/catalog/resolvers/catalog.resolver.ts
import { Resolver, Mutation, Query, Args, ID } from '@nestjs/graphql';
import { Product } from '@modules/domain/product/entities/product.entity';
import { CatalogService } from '../services/catalog.service';
import { CreateProductInput } from '../dto/create-product.input';

@Resolver(() => Product)
export class CatalogResolver {
  constructor(private readonly catalogService: CatalogService) {}

  @Query(() => Product)
  async product(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.catalogService.findById(id);
  }

  @Mutation(() => Product)
  async createProduct(@Args('input') input: CreateProductInput): Promise<Product> {
    return this.catalogService.createProduct(input);
  }
}
```

### Step 5: Create the module and register

```typescript
// src/modules/features/catalog/catalog.module.ts
import { Module } from '@nestjs/common';
import { ProductModule } from '@modules/domain/product/product.module';
import { CatalogService } from './services/catalog.service';
import { CatalogResolver } from './resolvers/catalog.resolver';

@Module({
  imports: [ProductModule],
  providers: [CatalogService, CatalogResolver],
})
export class CatalogModule {}
```

### Alternative: Using CQRS (for large projects)

If you need cross-feature communication or audit trails, use CQRS commands instead:

```bash
mkdir -p src/modules/features/catalog/commands
```

```typescript
// src/modules/features/catalog/commands/create-product.command.ts
import type { ICommand, ICommandHandler } from '@nestjs/cqrs';
import { CommandHandler, Logger } from '@nestjs/cqrs';
import { EntityManager } from '@mikro-orm/postgresql';
import { Product } from '@modules/domain/product/entities/product.entity';

export class CreateProductCommand implements ICommand {
  constructor(
    public readonly name: string,
    public readonly price: number,
  ) {}
}

@CommandHandler(CreateProductCommand)
export class CreateProductCommandHandler implements ICommandHandler<CreateProductCommand, Product> {
  private readonly logger = new Logger(CreateProductCommandHandler.name);

  constructor(private readonly em: EntityManager) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    const product = Product.create({
      name: command.name,
      price: command.price,
    });

    await this.em.persist(user).flush();
    return product;
  }
}

// Module with CQRS
@Module({
  imports: [CqrsModule, ProductModule],
  providers: [CatalogResolver, CreateProductCommandHandler],
})
export class CatalogModule {}
```

---

## How to Trigger a Cross-Module Action

Use CQRS when Feature A needs to trigger an action in Feature B.

### Step 1: Define the command

```typescript
// src/modules/features/notifications/commands/send-welcome-email.command.ts
import type { ICommand, ICommandHandler } from '@nestjs/cqrs';
import { CommandHandler, Logger } from '@nestjs/cqrs';

export class SendWelcomeEmailCommand implements ICommand {
  constructor(public readonly userId: string, public readonly email: string) {}
}

@CommandHandler(SendWelcomeEmailCommand)
export class SendWelcomeEmailCommandHandler
  implements ICommandHandler<SendWelcomeEmailCommand>
{
  private readonly logger = new Logger(SendWelcomeEmailCommandHandler.name);

  async execute(command: SendWelcomeEmailCommand): Promise<void> {
    this.logger.log(`Sending welcome email to ${command.email}`);
    // Send email logic here
  }
}
```

### Step 2: Register the handler

```typescript
// notifications.module.ts
@Module({
  imports: [CqrsModule],
  providers: [SendWelcomeEmailCommandHandler],
})
export class NotificationsModule {}
```

### Step 3: Dispatch from another feature

```typescript
// registration command handler
import { CommandBus } from '@nestjs/cqrs';
import { SendWelcomeEmailCommand } from '@modules/features/notifications/commands/send-welcome-email.command';

@CommandHandler(RegisterUserCommand)
export class RegisterUserCommandHandler implements ICommandHandler<RegisterUserCommand> {
  constructor(
    private readonly em: EntityManager,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: RegisterUserCommand): Promise<User> {
    const user = User.create({ email: command.email, name: command.name });
    await this.em.persist(user).flush();

    // Trigger cross-module action
    await this.commandBus.execute(
      new SendWelcomeEmailCommand(user.id, user.email)
    );

    return user;
  }
}
```

---

## How to Add a New GraphQL Query/Mutation

### Query Example

```typescript
@Resolver(() => Product)
export class CatalogResolver {
  @Query(() => [Product], { description: 'Get all active products' })
  async products(
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, defaultValue: 0 }) offset: number,
  ): Promise<Product[]> {
    return this.catalogService.findAll({ limit, offset });
  }

  @Query(() => Product, { description: 'Get product by ID' })
  async product(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.catalogService.findById(id);
  }
}
```

### Mutation Example

```typescript
@Resolver(() => Product)
export class CatalogResolver {
  @Mutation(() => Product, { description: 'Publish a draft product' })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async publishProduct(@Args('id', { type: () => ID }) id: string): Promise<Product> {
    return this.catalogService.publishProduct(id);
  }
}
```

---

## How to Add Role-Based Access Control

### Step 1: Use the guards and decorators

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@core/auth/guards/auth.guard';
import { RolesGuard } from '@core/auth/guards/roles.guard';
import { Roles } from '@core/auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '@core/auth/decorators/current-user.decorator';
import { UserRole } from '@modules/domain/user/entities/user.entity';

@Resolver(() => User)
export class UserResolver {
  // Public endpoint
  @Query(() => User)
  async publicUser(@Args('id') id: string): Promise<User> {
    return this.userService.findById(id);
  }

  // Authenticated endpoint
  @Query(() => User)
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: CurrentUserPayload): Promise<User> {
    return this.userService.findById(user.userId);
  }

  // Admin-only endpoint
  @Mutation(() => Boolean)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteUser(@Args('id') id: string): Promise<boolean> {
    await this.userService.delete(id);
    return true;
  }

  // Multiple roles
  @Query(() => [User])
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  async allUsers(): Promise<User[]> {
    return this.userService.findAll();
  }
}
```

---

## How to Create a Database Migration

### Create migration

```bash
pnpm run db:migrate:create -- --name=add-status-to-users
```

### Edit the migration

```typescript
// src/core/database/migrations/Migration20240101000000_add-status-to-users.ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20240101000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "users"
      ADD COLUMN "status" varchar(50) NOT NULL DEFAULT 'active';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "users"
      DROP COLUMN "status";
    `);
  }
}
```

### Run migrations

```bash
pnpm run db:migrate:up    # Apply
pnpm run db:migrate:down  # Rollback
```

---

## How to Add a New Configuration

### Step 1: Create config file

```typescript
// src/config/redis.config.ts
import { registerAs } from '@nestjs/config';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

export const REDIS_CONFIG_KEY = 'redis';

export default registerAs<RedisConfig>(REDIS_CONFIG_KEY, () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));
```

### Step 2: Register in app.module.ts

```typescript
import redisConfig from '@config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig, awsConfig, redisConfig],
    }),
  ],
})
export class AppModule {}
```

### Step 3: Use in services

```typescript
import { ConfigService } from '@nestjs/config';
import type { RedisConfig } from '@config/redis.config';
import { REDIS_CONFIG_KEY } from '@config/redis.config';

@Injectable()
export class CacheService {
  constructor(private readonly configService: ConfigService) {
    const redisConfig = this.configService.get<RedisConfig>(REDIS_CONFIG_KEY);
    // Use redisConfig.host, redisConfig.port, etc.
  }
}
```

---

## How to Handle Domain Exceptions

### Step 1: Throw domain exceptions in entities/services

```typescript
import {
  DomainValidationException,
  EntityNotFoundException,
  BusinessRuleViolationException,
} from '@core/exceptions/domain.exceptions';

// In entity
static create(params: { price: number }): Product {
  if (params.price < 0) {
    throw new DomainValidationException('Price cannot be negative');
  }
  // ...
}

// In service
async findById(id: string): Promise<Product> {
  const product = await this.em.findOne(Product, { id });
  if (!product) {
    throw new EntityNotFoundException('Product', id);
  }
  return product;
}

// Business rule
publish(): void {
  if (this.status !== ProductStatus.DRAFT) {
    throw new BusinessRuleViolationException(
      'Cannot publish',
      'Only draft products can be published'
    );
  }
}
```

### Step 2: Exceptions are automatically mapped to GraphQL errors

The `GraphQLExceptionFilter` handles this automatically:

```json
{
  "errors": [
    {
      "message": "Product with identifier 'abc123' not found",
      "extensions": {
        "code": "ENTITY_NOT_FOUND",
        "statusCode": 404
      }
    }
  ]
}
```

### Available Exception Types

| Exception | Code | Status | Use Case |
|-----------|------|--------|----------|
| `EntityNotFoundException` | ENTITY_NOT_FOUND | 404 | Record not found |
| `EntityAlreadyExistsException` | ENTITY_ALREADY_EXISTS | 409 | Duplicate record |
| `DomainValidationException` | DOMAIN_VALIDATION_ERROR | 400 | Invalid input |
| `UnauthorizedOperationException` | UNAUTHORIZED_OPERATION | 403 | Permission denied |
| `BusinessRuleViolationException` | BUSINESS_RULE_VIOLATION | 422 | Business rule failed |
