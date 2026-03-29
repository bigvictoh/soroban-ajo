import { z } from 'zod'
import { schemaValidator } from '../../utils/validationChain'

const loginSchema = z.object({
  publicKey: z.string().regex(/^G[A-Z0-9]{55}$/, 'Invalid Stellar address'),
  signature: z.string().min(1),
})

const registerSchema = loginSchema.extend({
  username: z.string().min(3).max(50).optional(),
})

export const validateLogin = schemaValidator(loginSchema, 'body')
export const validateRegister = schemaValidator(registerSchema, 'body')
