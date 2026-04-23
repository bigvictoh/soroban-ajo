import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { AppError } from '../errors/AppError'
import { GoalsService } from '../services/goalsService'

export class GoalsController {
  constructor(private readonly service: GoalsService = new GoalsService()) {}

  createGoal = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.publicKey || req.body.userId
    if (!userId) throw new AppError('User ID is required', 'UNAUTHORIZED', 401)
    const goal = await this.service.createGoal(userId, req.body)
    res.status(201).json({ success: true, data: goal })
  })

  getGoals = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.publicKey || req.query.userId
    if (!userId) throw new AppError('User ID is required', 'UNAUTHORIZED', 401)
    const goals = await this.service.getGoals(String(userId))
    res.status(200).json({ success: true, data: goals })
  })

  getGoal = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.getGoal(req.params.id)
    res.status(200).json({ success: true, data: goal })
  })

  updateGoal = asyncHandler(async (req: Request, res: Response) => {
    const goal = await this.service.updateGoal(req.params.id, req.body)
    res.status(200).json({ success: true, data: goal })
  })

  deleteGoal = asyncHandler(async (req: Request, res: Response) => {
    await this.service.deleteGoal(req.params.id)
    res.status(200).json({ success: true, message: 'Goal deleted successfully' })
  })

  checkAffordability = asyncHandler(async (req: Request, res: Response) => {
    const data = this.service.checkAffordability(req.body)
    res.status(200).json({ success: true, data })
  })

  calculateProjection = asyncHandler(async (req: Request, res: Response) => {
    const data = this.service.calculateProjection(req.body)
    res.status(200).json({ success: true, data })
  })
}

export const goalsController = new GoalsController()
