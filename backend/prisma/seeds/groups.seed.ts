import { PrismaClient } from '@prisma/client';

export async function seedGroups(prisma: PrismaClient) {
  const groups = [
    {
      id: 'group-1',
      name: 'Monthly Savings Circle',
      contributionAmount: BigInt(500),
      frequency: 30,
      maxMembers: 10,
      currentRound: 1,
      isActive: true,
    },
    {
      id: 'group-2',
      name: 'Emergency Fund Group',
      contributionAmount: BigInt(1000),
      frequency: 30,
      maxMembers: 8,
      currentRound: 2,
      isActive: true,
    },
  ];

  for (const group of groups) {
    await prisma.group.create({ data: group });
  }

  console.log(`✅ Seeded ${groups.length} groups`);
}