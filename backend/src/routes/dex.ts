import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { stellarDEXService, Asset } from '../services/stellarDEXService'

export const dexRouter = Router()

/**
 * @swagger
 * tags:
 *   name: DEX
 *   description: Stellar DEX integration – swaps, liquidity pools, price feeds
 */

// ─── Price Feeds ──────────────────────────────────────────────────────────────

/**
 * GET /api/dex/price?baseCode=XLM&quoteCode=USDC&quoteIssuer=G...
 * Get current price for a trading pair
 */
dexRouter.get('/price', async (req: Request, res: Response) => {
  try {
    const { baseCode, baseIssuer, quoteCode, quoteIssuer } = req.query as Record<string, string>
    if (!baseCode || !quoteCode) {
      return res.status(400).json({ error: 'baseCode and quoteCode required' })
    }

    const base: Asset = { code: baseCode, issuer: baseIssuer || undefined }
    const quote: Asset = { code: quoteCode, issuer: quoteIssuer || undefined }

    const feed = await stellarDEXService.getPrice(base, quote)
    res.json({ success: true, feed })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/dex/prices
 * Get prices for multiple pairs
 * body: { pairs: [{ base: Asset, quote: Asset }] }
 */
dexRouter.post('/prices', async (req: Request, res: Response) => {
  try {
    const { pairs } = req.body
    if (!Array.isArray(pairs) || !pairs.length) {
      return res.status(400).json({ error: 'pairs array required' })
    }
    const feeds = await stellarDEXService.getPrices(pairs)
    res.json({ success: true, feeds })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Swap ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/dex/swap/quote
 * Get a swap quote (no transaction submitted)
 * body: { sourceAsset: Asset, destAsset: Asset, sourceAmount: string }
 */
dexRouter.post('/swap/quote', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { sourceAsset, destAsset, sourceAmount } = req.body
    if (!sourceAsset || !destAsset || !sourceAmount) {
      return res.status(400).json({ error: 'sourceAsset, destAsset, sourceAmount required' })
    }
    const quote = await stellarDEXService.getSwapQuote(sourceAsset, destAsset, sourceAmount)
    res.json({ success: true, quote })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/dex/swap/execute
 * Execute a swap using the caller's secret key.
 * body: { secretKey, sourceAsset, destAsset, sourceAmount, minDestAmount, destAccount? }
 *
 * NOTE: In production, use a signing service or hardware wallet — never send secret keys over HTTP.
 * This endpoint is for testnet/demo use only.
 */
dexRouter.post('/swap/execute', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { secretKey, sourceAsset, destAsset, sourceAmount, minDestAmount } = req.body
    if (!secretKey || !sourceAsset || !destAsset || !sourceAmount || !minDestAmount) {
      return res.status(400).json({
        error: 'secretKey, sourceAsset, destAsset, sourceAmount, minDestAmount required',
      })
    }

    const keypair = (() => {
      try {
        return require('stellar-sdk').Keypair.fromSecret(secretKey)
      } catch {
        throw new Error('Invalid secret key')
      }
    })()

    const destAccount = req.body.destAccount ?? keypair.publicKey()

    const result = await stellarDEXService.executeSwap(
      keypair,
      sourceAsset,
      destAsset,
      sourceAmount,
      minDestAmount,
      destAccount
    )
    res.json({ success: true, result })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── Liquidity Pools ──────────────────────────────────────────────────────────

/**
 * GET /api/dex/pools
 * List liquidity pools, optionally filtered by asset
 * query: assetCode, assetIssuer, limit
 */
dexRouter.get('/pools', async (req: Request, res: Response) => {
  try {
    const { assetCode, assetIssuer, limit } = req.query as Record<string, string>
    const assetFilter = assetCode
      ? { code: assetCode, issuer: assetIssuer || undefined }
      : undefined

    const pools = await stellarDEXService.getLiquidityPools(assetFilter, Number(limit) || 20)
    res.json({ success: true, pools })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/dex/pools/:id
 * Get a specific liquidity pool
 */
dexRouter.get('/pools/:id', async (req: Request, res: Response) => {
  try {
    const pool = await stellarDEXService.getLiquidityPool(req.params.id)
    res.json({ success: true, pool })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/dex/pools/deposit-xdr
 * Build an unsigned deposit transaction XDR
 * body: { accountId, poolId, maxAmountA, maxAmountB, minPrice, maxPrice }
 */
dexRouter.post('/pools/deposit-xdr', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, poolId, maxAmountA, maxAmountB, minPrice, maxPrice } = req.body
    if (!accountId || !poolId || !maxAmountA || !maxAmountB || !minPrice || !maxPrice) {
      return res.status(400).json({ error: 'accountId, poolId, maxAmountA, maxAmountB, minPrice, maxPrice required' })
    }
    const xdr = await stellarDEXService.buildLiquidityDepositXdr(
      accountId, poolId, maxAmountA, maxAmountB, minPrice, maxPrice
    )
    res.json({ success: true, xdr })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

/**
 * POST /api/dex/pools/withdraw-xdr
 * Build an unsigned withdraw transaction XDR
 * body: { accountId, poolId, amount, minAmountA, minAmountB }
 */
dexRouter.post('/pools/withdraw-xdr', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { accountId, poolId, amount, minAmountA, minAmountB } = req.body
    if (!accountId || !poolId || !amount || !minAmountA || !minAmountB) {
      return res.status(400).json({ error: 'accountId, poolId, amount, minAmountA, minAmountB required' })
    }
    const xdr = await stellarDEXService.buildLiquidityWithdrawXdr(
      accountId, poolId, amount, minAmountA, minAmountB
    )
    res.json({ success: true, xdr })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
