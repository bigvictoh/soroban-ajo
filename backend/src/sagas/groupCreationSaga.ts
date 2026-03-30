import { prisma } from '../../config/database'
import { sagaOrchestrator, SagaStep } from '../sagaOrchestrator'
import { v4 as uuidv4 } from 'uuid'

export interface GroupCreationPayload {
  name: string
  description: string
  creatorId: string
  members: string[]
  contributionAmount: number
}

export async function executeGroupCreationSaga(payload: GroupCreationPayload): Promise<string> {
  const sagaId = uuidv4()

  const steps: SagaStep[] = [
    {
      name: 'create-group',
      action: async () => {
        const group = await prisma.group.create({
          data: {
            name: payload.name,
            description: payload.description,
            creatorId: payload.creatorId,
            status: 'active',
          },
        })
        return group.id
      },
      compensation: async () => {
        // This would be stored in saga state for compensation
      },
    },
    {
      name: 'add-members',
      action: async () => {
        await prisma.groupMember.createMany({
          data: payload.members.map((memberId) => ({
            groupId: '', // Would be retrieved from saga state
            userId: memberId,
            role: 'member',
            joinedAt: new Date(),
          })),
        })
      },
      compensation: async () => {
        // Delete added members
      },
    },
    {
      name: 'initialize-contributions',
      action: async () => {
        // Initialize contribution tracking
      },
      compensation: async () => {
        // Cleanup contribution records
      },
    },
  ]

  await sagaOrchestrator.executeSaga(sagaId, 'group-creation', steps)
  return sagaId
}
