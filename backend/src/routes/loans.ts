import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { loanService } from '../services/loanService'

const router = Router()

// Request a loan from the group pool
router.post('/request', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const caller = req.user?.publicKey
    if (!caller) return res.status(401).json({ error: 'Unauthorized' })
    const { groupId, amount, interestRateBps, repaymentPeriod, signedXdr } = req.body
    if (!groupId || !amount) return res.status(400).json({ error: 'groupId and amount required' })
    const result = await loanService.requestLoan({ caller, groupId, amount, interestRateBps: interestRateBps ?? 500, repaymentPeriod: repaymentPeriod ?? 2592000, signedXdr })
    res.status(201).json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Vote on a loan request
router.post('/:loanId/vote', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const voter = req.user?.publicKey
    if (!voter) return res.status(401).json({ error: 'Unauthorized' })
    const { inFavor, signedXdr } = req.body
    if (inFavor === undefined) return res.status(400).json({ error: 'inFavor required' })
    const result = await loanService.voteOnLoan({ voter, loanId: req.params.loanId, inFavor, signedXdr })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Disburse an approved loan
router.post('/:loanId/disburse', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const caller = req.user?.publicKey
    if (!caller) return res.status(401).json({ error: 'Unauthorized' })
    const { signedXdr } = req.body
    const result = await loanService.disburseLoan({ caller, loanId: req.params.loanId, signedXdr })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Repay a loan
router.post('/:loanId/repay', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const borrower = req.user?.publicKey
    if (!borrower) return res.status(401).json({ error: 'Unauthorized' })
    const { amount, signedXdr } = req.body
    if (!amount) return res.status(400).json({ error: 'amount required' })
    const result = await loanService.repayLoan({ borrower, loanId: req.params.loanId, amount, signedXdr })
    res.json({ success: true, data: result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Get a loan by ID
router.get('/:loanId', async (req, res) => {
  try {
    const loan = await loanService.getLoan(req.params.loanId)
    if (!loan) return res.status(404).json({ error: 'Loan not found' })
    res.json({ success: true, data: loan })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// Get all loans for a group
router.get('/group/:groupId', async (req, res) => {
  try {
    const loans = await loanService.getGroupLoans(req.params.groupId)
    res.json({ success: true, data: loans })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export const loansRouter = router
