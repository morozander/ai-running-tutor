import { type Opt, PrimaryKey, Property } from '@mikro-orm/core';
import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

/**
 * Base entity with common fields
 *
 * All domain entities should extend this class.
 * Uses UUID for Lambda-friendly distributed ID generation.
 *
 * Note: Column names are auto-converted to snake_case by UnderscoreNamingStrategy
 * (e.g., createdAt -> created_at)
 */
@ObjectType({ isAbstract: true })
export abstract class BaseEntity {
  @Field(() => ID)
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Field(() => GraphQLISODateTime)
  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  @Field(() => GraphQLISODateTime)
  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date & Opt = new Date();

  @Property({ nullable: true, hidden: true })
  deletedAt?: Date;

  /**
   * Soft delete the entity
   */
  softDelete(): void {
    this.deletedAt = new Date();
  }

  /**
   * Restore a soft-deleted entity
   */
  restore(): void {
    this.deletedAt = undefined;
  }

  /**
   * Check if entity is soft-deleted
   */
  isDeleted(): boolean {
    return this.deletedAt !== undefined;
  }
}
