import { prisma } from '../../config/database'
import { sagaOrchestrator, SagaStep } from '../sagaOrchestrator'
import { v4 as uuidv4 } from 'uuid'

export interface PayoutPayload {
  groupId: string
  recipientId: string
  amount: number
  blockchainTxId?: string
}

export async function executePayoutSaga(payload: PayoutPayload): Promise<string> {
  const sagaId = uuidv4()

  const steps: SagaStep[] = [
    {
      name: 'validate-payout',
      action: async () => {
        const group = await prisma.group.findUnique({
          where: { id: payload.groupId },
        })

        if (!group) throw new Error('Group not found')
        if (group.balance < payload.amount) throw new Error('Insufficient balance')
      },
      compensation: async () => {
        // No compensation needed for validation
      },
    },
    {
      name: 'deduct-balance',
      action: async () => {
        await prisma.group.update({
          where: { id: payload.groupId },
          data: {
            balance: {
              decrement: payload.amount,
            },
          },
        })
      },
      compensation: async () => {
        await prisma.group.update({
          where: { id: payload.groupId },
          data: {
            balance: {
              increment: payload.amount,
            },
          },
        })
      },
    },
    {
      name: 'process-blockchain-transfer',
      action: async () => {
        // Blockchain transfer logic
        // This would call sorobanService
      },
      compensation: async () => {
        // Reverse blockchain transaction if needed
      },
    },
    {
      name: 'record-payout',
      action: async () => {
        await prisma.transaction.create({
          data: {
            groupId: payload.groupId,
            type: 'payout',
            amount: payload.amount,
            recipientId: payload.recipientId,
            status: 'completed',
            blockchainTxId: payload.blockchainTxId,
          },
        })
      },
      compensation: async () => {
        // Mark transaction as failed
      },
    },
  ]

  await sagaOrchestrator.executeSaga(sagaId, 'payout', steps)
  return sagaId
}
