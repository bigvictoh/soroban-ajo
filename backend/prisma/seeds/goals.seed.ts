import { PrismaClient } from '@prisma/client';

export async function seedGoals(prisma: PrismaClient) {
  const existingUsers = await prisma.user.findMany({ take: 2 });

  const goals = [
    {
      userId: existingUsers[0]?.walletAddress ?? '',
      title: 'First House Deposit',
      description: 'Save for my first home deposit',
      targetAmount: BigInt(500000),
      currentAmount: BigInt(25000),
      deadline: new Date(new Date().setMonth(new Date().getMonth() + 12)),
      category: 'HOME',
      isPublic: false,
      status: 'ACTIVE',
    },
    {
      userId: existingUsers[1]?.walletAddress ?? '',
      title: 'Emergency Fund',
      description: 'Six months savings buffer',
      targetAmount: BigInt(150000),
      currentAmount: BigInt(45000),
      deadline: new Date(new Date().setMonth(new Date().getMonth() + 8)),
      category: 'EMERGENCY',
      isPublic: false,
      status: 'ACTIVE',
    },
  ];

  for (const goal of goals) {
    if (!goal.userId) continue;
    await prisma.goal.create({ data: goal });
  }

  console.log(`✅ Seeded ${goals.length} goals`);
}