import { PrismaClient } from '@prisma/client';

export async function seedUsers(prisma: PrismaClient) {
  const users = [
    {
      walletAddress: '0xuser1walletaddress000000000000000000000001',
    },
    {
      walletAddress: '0xuser2walletaddress000000000000000000000002',
    },
    {
      walletAddress: '0xuser3walletaddress000000000000000000000003',
    },
  ];

  for (const user of users) {
    await prisma.user.create({ data: user });
  }

  console.log(`✅ Seeded ${users.length} users`);
}