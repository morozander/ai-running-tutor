import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { UserSeeder } from './user.seeder';

export class DatabaseSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    console.log('Starting database seeding...');

    // Run seeders in order (dependencies first)
    await this.call(em, [
      UserSeeder, // Users second (no dependencies)
    ]);

    console.log('Database seeding completed successfully!');
  }
}
