import { Request, Response } from 'express'
import { globalSearch } from '../services/searchService'
import { logger } from '../utils/logger'

export const globalSearchHandler = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string
    if (!query) return res.status(400).json({ error: 'q is required' })
    const results = await globalSearch(query, req.query.type as string, Number(req.query.limit) || 5)
    res.json({ data: results })
  } catch (error) {
    logger.error('Search Controller Error', { error })
    res.status(500).json({ error: 'Internal server error during search' })
  }
}
