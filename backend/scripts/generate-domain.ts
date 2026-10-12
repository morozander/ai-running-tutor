#!/usr/bin/env ts-node

/**
 * Domain Generator Script
 *
 * Generates a new domain module with all necessary files.
 *
 * Usage: pnpm run create:domain <domain-name>
 * Example: pnpm run create:domain product
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// Utility functions for case conversion
const toKebabCase = (str: string): string =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();

const toPascalCase = (str: string): string =>
  str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

const toCamelCase = (str: string): string => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

// Templates
const entityTemplate = (name: string) => `import { Entity, Property } from '@mikro-orm/core';
import { ObjectType, Field } from '@nestjs/graphql';
import { BaseEntity } from '@shared/database/base.entity';
import { DomainValidationException } from '@core/exceptions/domain.exceptions';

/**
 * ${toPascalCase(name)} entity
 *
 * Note: Column names are auto-converted to snake_case by UnderscoreNamingStrategy
 */
@ObjectType()
@Entity({ tableName: '${toKebabCase(name)}s' })
export class ${toPascalCase(name)} extends BaseEntity {
  @Field()
  @Property()
  name!: string;

  // Add more fields here (camelCase -> snake_case automatically)

  /**
   * Factory method to create a new ${toPascalCase(name)}
   */
  static create(params: { name: string }): ${toPascalCase(name)} {
    const trimmedName = params.name?.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new DomainValidationException('Name must be at least 2 characters');
    }

    const entity = new ${toPascalCase(name)}();
    entity.name = trimmedName;
    return entity;
  }
}
`;

const serviceTemplate = (name: string) => `import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ${toPascalCase(name)} } from '../entities/${toKebabCase(name)}.entity';
import { EntityNotFoundException } from '@core/exceptions/domain.exceptions';

/**
 * ${toPascalCase(name)} domain service
 *
 * Read-only operations. Mutations should be handled in feature modules
 * with proper transaction management.
 */
@Injectable()
export class ${toPascalCase(name)}Service {
  private readonly logger = new Logger(${toPascalCase(name)}Service.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Find ${toCamelCase(name)} by ID
   */
  async findById(id: string): Promise<${toPascalCase(name)}> {
    const entity = await this.em.findOne(${toPascalCase(name)}, { id, deletedAt: null });
    if (!entity) {
      throw new EntityNotFoundException('${toPascalCase(name)}', id);
    }
    return entity;
  }

  /**
   * Get all ${toCamelCase(name)}s (with pagination)
   */
  async findAll(options: { limit?: number; offset?: number } = {}): Promise<{
    items: ${toPascalCase(name)}[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options;

    const [items, total] = await this.em.findAndCount(
      ${toPascalCase(name)},
      { deletedAt: null },
      {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      },
    );

    return { items, total };
  }
}
`;

const moduleTemplate = (name: string) => `import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ${toPascalCase(name)} } from './entities/${toKebabCase(name)}.entity';
import { ${toPascalCase(name)}Service } from './services/${toKebabCase(name)}.service';

/**
 * ${toPascalCase(name)} Domain Module
 */
@Module({
  imports: [MikroOrmModule.forFeature([${toPascalCase(name)}])],
  providers: [${toPascalCase(name)}Service],
  exports: [${toPascalCase(name)}Service],
})
export class ${toPascalCase(name)}Module {}
`;

const testTemplate = (
  name: string,
) => `import { ${toPascalCase(name)} } from '../entities/${toKebabCase(name)}.entity';
import { DomainValidationException } from '@core/exceptions/domain.exceptions';

describe('${toPascalCase(name)} Entity', () => {
  describe('create', () => {
    it('should create a valid ${toCamelCase(name)}', () => {
      const entity = ${toPascalCase(name)}.create({ name: 'Test ${toPascalCase(name)}' });
      
      expect(entity.name).toBe('Test ${toPascalCase(name)}');
    });

    it('should throw for invalid name', () => {
      expect(() => ${toPascalCase(name)}.create({ name: 'a' })).toThrow(DomainValidationException);
    });
  });
});
`;

// Main function
function generateDomain(name: string): void {
  const kebabName = toKebabCase(name);
  const basePath = path.join(process.cwd(), 'src', 'modules', 'domain', kebabName);

  // Check if domain already exists
  if (fs.existsSync(basePath)) {
    console.error(`❌ Domain '${kebabName}' already exists at ${basePath}`);
    process.exit(1);
  }

  // Create directories
  const dirs = ['entities', 'services', 'queries', '__tests__'];
  dirs.forEach((dir) => {
    fs.mkdirSync(path.join(basePath, dir), { recursive: true });
  });

  // Create files
  const files = [
    { path: `entities/${kebabName}.entity.ts`, content: entityTemplate(name) },
    { path: `services/${kebabName}.service.ts`, content: serviceTemplate(name) },
    { path: `${kebabName}.module.ts`, content: moduleTemplate(name) },
    { path: `__tests__/${kebabName}.entity.spec.ts`, content: testTemplate(name) },
  ];

  files.forEach((file) => {
    fs.writeFileSync(path.join(basePath, file.path), file.content);
  });

  console.log(`✅ Domain '${kebabName}' created successfully!`);
  console.log(`\n📁 Created at: ${basePath}`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Add ${toPascalCase(name)}Module to src/modules/domain/domain.modules.ts`);
  console.log(
    `   2. Create a migration: pnpm run db:migrate:create -- --name=create-${kebabName}s-table`,
  );
  console.log(`   3. Add more fields to the entity`);
  console.log(`   4. Create a feature module if needed`);
}

// CLI entry point
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ Please provide a domain name');
  console.log('Usage: pnpm run create:domain <domain-name>');
  console.log('Example: pnpm run create:domain product');
  process.exit(1);
}

generateDomain(args[0]);
