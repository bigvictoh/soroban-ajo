import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export type ValidationMiddleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>

export interface ValidationChainOptions {
  abortEarly?: boolean
}

/**
 * Compose multiple validation middlewares into a single middleware.
 * By default runs all validators and collects all errors (abortEarly: false).
 */
export function createValidationChain(
  validators: ValidationMiddleware[],
  options: ValidationChainOptions = {}
): ValidationMiddleware {
  const { abortEarly = false } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    const errors: { path: string; message: string; code: string }[] = []

    for (const validator of validators) {
      let calledNext = false
      let nextError: unknown = undefined

      await new Promise<void>((resolve) => {
        const mockNext = (err?: unknown) => {
          calledNext = true
          if (err) nextError = err
          resolve()
        }
        const result = validator(req, res, mockNext as NextFunction)
        if (result instanceof Promise) {
          result.then(resolve).catch((e) => { nextError = e; resolve() })
        } else if (!calledNext) {
          // validator sent response directly — stop chain
          resolve()
        }
      })

      if (nextError instanceof ZodError) {
        errors.push(
          ...nextError.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          }))
        )
        if (abortEarly) break
      } else if (nextError) {
        return next(nextError)
      }

      // If response was already sent (validator rejected inline), stop
      if (res.headersSent) return
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, error: 'Validation failed', details: errors })
      return
    }

    next()
  }
}

/**
 * Build a schema validator that passes the ZodError to next() instead of responding,
 * so the chain can collect it.
 */
export function schemaValidator(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
): ValidationMiddleware {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      req[source] = await schema.parseAsync(req[source])
      next()
    } catch (err) {
      next(err)
    }
  }
}
