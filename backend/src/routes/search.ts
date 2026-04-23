/**
 * Search routes — Issue #597
 * Full-text search with filters, sorting, and saved searches.
 */
import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import * as ss from '../services/searchService'
import { logger } from '../utils/logger'

export const searchRouter = Router()

/** GET /api/search?q=&type=&limit= — legacy global search (backward compat) */
searchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string
    if (!q) return res.status(400).json({ error: 'q is required' })
    const results = await ss.globalSearch(q, req.query.type as string, Number(req.query.limit) || 5)
    res.json({ data: results })
  } catch (err) {
    logger.error('globalSearch error', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

/** GET /api/search/groups — advanced group search */
searchRouter.get('/groups', async (req: Request, res: Response) => {
  try {
    const p = req.query as any
    const result = await ss.searchGroups({
      q: p.q,
      isActive: p.isActive !== undefined ? p.isActive === 'true' : undefined,
      minAmount: p.minAmount ? Number(p.minAmount) : undefined,
      maxAmount: p.maxAmount ? Number(p.maxAmount) : undefined,
      minMembers: p.minMembers ? Number(p.minMembers) : undefined,
      maxMembers: p.maxMembers ? Number(p.maxMembers) : undefined,
      sortBy: p.sortBy,
      sortDir: p.sortDir,
      page: p.page ? Number(p.page) : 1,
      limit: p.limit ? Number(p.limit) : 20,
    })
    res.json({ success: true, ...result })
  } catch (err) {
    logger.error('searchGroups error', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

/** GET /api/search/members — advanced member search */
searchRouter.get('/members', async (req: Request, res: Response) => {
  try {
    const p = req.query as any
    const result = await ss.searchMembers({
      q: p.q,
      emailVerified: p.emailVerified !== undefined ? p.emailVerified === 'true' : undefined,
      phoneVerified: p.phoneVerified !== undefined ? p.phoneVerified === 'true' : undefined,
      minTrustScore: p.minTrustScore ? Number(p.minTrustScore) : undefined,
      kycLevel: p.kycLevel ? Number(p.kycLevel) : undefined,
      sortBy: p.sortBy,
      sortDir: p.sortDir,
      page: p.page ? Number(p.page) : 1,
      limit: p.limit ? Number(p.limit) : 20,
    })
    res.json({ success: true, ...result })
  } catch (err) {
    logger.error('searchMembers error', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

// ── Saved searches (auth required) ────────────────────────────────────────

searchRouter.use('/saved', authMiddleware)

/** GET /api/search/saved */
searchRouter.get('/saved', async (req: AuthRequest, res: Response) => {
  const saved = await ss.getSavedSearches(req.user!.walletAddress!)
  res.json({ success: true, data: saved })
})

/** POST /api/search/saved */
searchRouter.post('/saved', async (req: AuthRequest, res: Response) => {
  const { name, entity, filters } = req.body
  if (!name || !entity || !filters) {
    return res.status(400).json({ error: 'name, entity, and filters are required' })
  }
  const saved = await ss.createSavedSearch(req.user!.walletAddress!, name, entity, filters)
  res.status(201).json({ success: true, data: saved })
})

/** DELETE /api/search/saved/:id */
searchRouter.delete('/saved/:id', async (req: AuthRequest, res: Response) => {
  await ss.deleteSavedSearch(req.params.id, req.user!.walletAddress!)
  res.json({ success: true })
})
