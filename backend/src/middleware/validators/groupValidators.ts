import { z } from 'zod'
import { schemaValidator } from '../../utils/validationChain'
import { commonSchemas } from '../validation'

const groupCreateSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  contributionAmount: z.number().int().positive(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  maxMembers: z.number().int().min(2).max(100),
  admin: commonSchemas.stellarAddress,
})

const groupJoinSchema = z.object({
  publicKey: commonSchemas.stellarAddress,
})

export const validateGroupCreate = schemaValidator(groupCreateSchema, 'body')
export const validateGroupJoin = schemaValidator(groupJoinSchema, 'body')
export const validateGroupId = schemaValidator(z.object({ id: z.string().min(1) }), 'params')
