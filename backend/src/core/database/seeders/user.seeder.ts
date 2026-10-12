import type { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import { User, UserRole } from '@modules/domain/user/entities/user.entity';

export class UserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const users = [
      {
        id: '5a0c7a2a-c8b5-4434-85b9-b7c959de7c20',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      },
      {
        id: '542e5cca-9eab-4469-9011-e195b3c017b3',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
      },
      {
        id: '23dbf1d0-0507-4936-8fb2-0b7d5efeaaa4',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.USER,
      },
      {
        id: '0c8a35fc-10bc-48de-8e17-4851cf7796b3',
        email: 'bob.wilson@example.com',
        firstName: 'Bob',
        lastName: 'Wilson',
        role: UserRole.USER,
      },
      {
        id: '013f0d9b-37db-4a5e-b988-f12f14151753',
        email: 'alice.johnson@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        role: UserRole.USER,
      },
    ];

    for (const userData of users) {
      const existingUser = await em.findOne(User, { id: userData.id });
      if (!existingUser) {
        const user = User.create(userData);
        em.persist(user);
      }
    }

    await em.flush();
    console.log('Users seeded successfully');
  }
}
