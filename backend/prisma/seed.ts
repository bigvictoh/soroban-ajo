import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeds/users.seed';
import { seedGroups } from './seeds/groups.seed';
import { seedGoals } from './seeds/goals.seed';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (dev only)
  if (process.env.NODE_ENV === 'development') {
    await prisma.goal.deleteMany();
    await prisma.group.deleteMany();
    await prisma.user.deleteMany();
  }

  // Seed data
  await seedUsers(prisma);
  await seedGroups(prisma);
  await seedGoals(prisma);

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });