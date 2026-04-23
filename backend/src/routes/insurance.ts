import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { insuranceService } from '../services/insuranceService'

const router = Router()

// Get insurance pool info for a token
router.get('/pool/:tokenAddress', async (req, res) => {
  try {
    const pool = await insuranceService.getInsurancePool(req.params.tokenAddress)
    res.json({ success: true, data: pool })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// File an insurance claim
router.post('/claims', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const claimant = req.user?.publicKey
    if (!claimant) return res.status(401).json({ error: 'Unauthorized' })
    const { groupId, cycle, defaulter, amount, signedXdr } = req.body
    if (!groupId || cycle === undefined || !defaulter || !amount) {
      return res.status(400).json({ error: 'groupId, cycle, defaulter, and amount required' })
    }
    const result = await insuranceService.fileClaim({ claimant, groupId, cycle, defaulter, amount, signedXdr })
    res.status(201).json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Process (approve/reject) a claim — admin only
router.post('/claims/:claimId/process', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const admin = req.user?.publicKey
    if (!admin) return res.status(401).json({ error: 'Unauthorized' })
    const { approved, signedXdr } = req.body
    if (approved === undefined) return res.status(400).json({ error: 'approved required' })
    const result = await insuranceService.processClaim({ admin, claimId: req.params.claimId, approved, signedXdr })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export const insuranceRouter = router
