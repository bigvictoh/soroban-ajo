import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { emergencyService } from '../services/emergencyService'

const router = Router()

// Request an emergency withdrawal
router.post('/request', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const caller = req.user?.publicKey
    if (!caller) return res.status(401).json({ error: 'Unauthorized' })
    const { groupId, amount, reason, repayPeriod, signedXdr } = req.body
    if (!groupId || !amount || !reason) return res.status(400).json({ error: 'groupId, amount, and reason required' })
    const result = await emergencyService.requestEmergency({ caller, groupId, amount, reason, repayPeriod: repayPeriod ?? 2592000, signedXdr })
    res.status(201).json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Vote on an emergency request
router.post('/:reqId/vote', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const voter = req.user?.publicKey
    if (!voter) return res.status(401).json({ error: 'Unauthorized' })
    const { inFavor, signedXdr } = req.body
    if (inFavor === undefined) return res.status(400).json({ error: 'inFavor required' })
    const result = await emergencyService.voteOnEmergency({ voter, reqId: req.params.reqId, inFavor, signedXdr })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Disburse an approved emergency request
router.post('/:reqId/disburse', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const caller = req.user?.publicKey
    if (!caller) return res.status(401).json({ error: 'Unauthorized' })
    const { repayPeriod, signedXdr } = req.body
    const result = await emergencyService.disburseEmergency({ caller, reqId: req.params.reqId, repayPeriod: repayPeriod ?? 2592000, signedXdr })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Repay an emergency withdrawal
router.post('/:reqId/repay', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const requester = req.user?.publicKey
    if (!requester) return res.status(401).json({ error: 'Unauthorized' })
    const { amount, signedXdr } = req.body
    if (!amount) return res.status(400).json({ error: 'amount required' })
    const result = await emergencyService.repayEmergency({ requester, reqId: req.params.reqId, amount, signedXdr })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Get an emergency request by ID
router.get('/:reqId', async (req, res) => {
  try {
    const request = await emergencyService.getEmergencyRequest(req.params.reqId)
    if (!request) return res.status(404).json({ error: 'Emergency request not found' })
    res.json({ success: true, data: request })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Get all emergency requests for a group
router.get('/group/:groupId', async (req, res) => {
  try {
    const requests = await emergencyService.getGroupEmergencies(req.params.groupId)
    res.json({ success: true, data: requests })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export const emergencyRouter = router
