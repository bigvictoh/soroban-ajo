import * as StellarSdk from 'stellar-sdk'
import { createModuleLogger } from '../utils/logger'

const logger = createModuleLogger('StellarDEXService')

const RPC_URL = process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org'
const NETWORK_PASSPHRASE =
  process.env.SOROBAN_NETWORK_PASSPHRASE ?? StellarSdk.Networks.TESTNET
const HORIZON_URL =
  process.env.HORIZON_URL ?? 'https://horizon-testnet.stellar.org'

export interface Asset {
  code: string
  issuer?: string // undefined = XLM (native)
}

export interface SwapQuote {
  sourceAsset: Asset
  destAsset: Asset
  sourceAmount: string
  destAmount: string
  path: Asset[]
  priceImpact: number // percentage
  fee: string
}

export interface SwapResult {
  txHash: string
  sourceAmount: string
  destAmount: string
  status: 'SUCCESS' | 'FAILED'
}

export interface LiquidityPool {
  id: string
  assetA: Asset
  assetB: Asset
  reserveA: string
  reserveB: string
  totalShares: string
  fee: number // basis points (e.g. 30 = 0.3%)
}

export interface PriceFeed {
  baseAsset: Asset
  quoteAsset: Asset
  price: string
  bid: string
  ask: string
  spread: string
  timestamp: Date
  volume24h?: string
}

function toStellarAsset(asset: Asset): StellarSdk.Asset {
  if (!asset.issuer) return StellarSdk.Asset.native()
  return new StellarSdk.Asset(asset.code, asset.issuer)
}

function fromStellarAsset(asset: StellarSdk.Asset): Asset {
  if (asset.isNative()) return { code: 'XLM' }
  return { code: asset.getCode(), issuer: asset.getIssuer() }
}

export class StellarDEXService {
  private server: StellarSdk.Horizon.Server

  constructor() {
    this.server = new StellarSdk.Horizon.Server(HORIZON_URL)
  }

  // ─── Price Feeds ──────────────────────────────────────────────────────────

  /**
   * Fetch current price for a trading pair from the Stellar DEX order book.
   */
  async getPrice(base: Asset, quote: Asset): Promise<PriceFeed> {
    const baseAsset = toStellarAsset(base)
    const quoteAsset = toStellarAsset(quote)

    const orderbook = await this.server
      .orderbook(baseAsset, quoteAsset)
      .limit(1)
      .call()

    const bestBid = orderbook.bids[0]?.price ?? '0'
    const bestAsk = orderbook.asks[0]?.price ?? '0'

    const bidNum = parseFloat(bestBid)
    const askNum = parseFloat(bestAsk)
    const midPrice = bidNum > 0 && askNum > 0 ? ((bidNum + askNum) / 2).toFixed(7) : bestAsk || bestBid
    const spread = bidNum > 0 && askNum > 0 ? ((askNum - bidNum) / askNum * 100).toFixed(4) : '0'

    logger.info('Price fetched', { base: base.code, quote: quote.code, price: midPrice })

    return {
      baseAsset: base,
      quoteAsset: quote,
      price: midPrice,
      bid: bestBid,
      ask: bestAsk,
      spread,
      timestamp: new Date(),
    }
  }

  /**
   * Get prices for multiple pairs in parallel.
   */
  async getPrices(pairs: Array<{ base: Asset; quote: Asset }>): Promise<PriceFeed[]> {
    return Promise.all(pairs.map(({ base, quote }) => this.getPrice(base, quote)))
  }

  // ─── Swap / Path Payment ──────────────────────────────────────────────────

  /**
   * Find the best swap path and quote using Stellar's strict-send path payment.
   */
  async getSwapQuote(
    sourceAsset: Asset,
    destAsset: Asset,
    sourceAmount: string
  ): Promise<SwapQuote> {
    const src = toStellarAsset(sourceAsset)
    const dst = toStellarAsset(destAsset)

    const paths = await this.server
      .strictSendPaths(src, sourceAmount, [dst])
      .call()

    if (!paths.records.length) {
      throw new Error(`No swap path found from ${sourceAsset.code} to ${destAsset.code}`)
    }

    // Pick the path with the highest destination amount
    const best = paths.records.reduce((a, b) =>
      parseFloat(a.destination_amount) >= parseFloat(b.destination_amount) ? a : b
    )

    const path: Asset[] = (best.path ?? []).map((p: any) =>
      p.asset_type === 'native'
        ? { code: 'XLM' }
        : { code: p.asset_code, issuer: p.asset_issuer }
    )

    // Estimate price impact (simplified: compare to direct order book price)
    let priceImpact = 0
    try {
      const directPrice = await this.getPrice(sourceAsset, destAsset)
      const expectedDest = parseFloat(sourceAmount) * parseFloat(directPrice.price)
      const actualDest = parseFloat(best.destination_amount)
      if (expectedDest > 0) {
        priceImpact = Math.abs((expectedDest - actualDest) / expectedDest) * 100
      }
    } catch {
      // ignore if direct price unavailable
    }

    return {
      sourceAsset,
      destAsset,
      sourceAmount,
      destAmount: best.destination_amount,
      path,
      priceImpact: parseFloat(priceImpact.toFixed(4)),
      fee: '0.00001', // Stellar base fee in XLM
    }
  }

  /**
   * Build and submit a strict-send path payment (swap) transaction.
   * The caller provides a funded keypair.
   */
  async executeSwap(
    sourceKeypair: StellarSdk.Keypair,
    sourceAsset: Asset,
    destAsset: Asset,
    sourceAmount: string,
    minDestAmount: string,
    destAccount: string
  ): Promise<SwapResult> {
    const src = toStellarAsset(sourceAsset)
    const dst = toStellarAsset(destAsset)

    // Find best path
    const paths = await this.server
      .strictSendPaths(src, sourceAmount, [dst])
      .call()

    if (!paths.records.length) {
      throw new Error('No swap path available')
    }

    const best = paths.records[0]
    const intermediatePath = (best.path ?? []).map((p: any) =>
      p.asset_type === 'native'
        ? StellarSdk.Asset.native()
        : new StellarSdk.Asset(p.asset_code, p.asset_issuer)
    )

    const account = await this.server.loadAccount(sourceKeypair.publicKey())

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset: src,
          sendAmount: sourceAmount,
          destination: destAccount,
          destAsset: dst,
          destMin: minDestAmount,
          path: intermediatePath,
        })
      )
      .setTimeout(30)
      .build()

    tx.sign(sourceKeypair)

    try {
      const result = await this.server.submitTransaction(tx)
      logger.info('Swap executed', { hash: result.hash, sourceAmount, destAsset: destAsset.code })
      return {
        txHash: result.hash,
        sourceAmount,
        destAmount: best.destination_amount,
        status: 'SUCCESS',
      }
    } catch (err: any) {
      logger.error('Swap failed', { err: err.message })
      return {
        txHash: '',
        sourceAmount,
        destAmount: '0',
        status: 'FAILED',
      }
    }
  }

  // ─── Liquidity Pools ──────────────────────────────────────────────────────

  /**
   * List available liquidity pools, optionally filtered by asset.
   */
  async getLiquidityPools(assetFilter?: Asset, limit = 20): Promise<LiquidityPool[]> {
    let query = this.server.liquidityPools().limit(limit)

    if (assetFilter) {
      query = query.forAssets(toStellarAsset(assetFilter))
    }

    const result = await query.call()

    return result.records.map((pool: any) => {
      const [reserveA, reserveB] = pool.reserves ?? []
      const assetA = reserveA?.asset === 'native'
        ? { code: 'XLM' }
        : { code: reserveA?.asset?.split(':')[0], issuer: reserveA?.asset?.split(':')[1] }
      const assetB = reserveB?.asset === 'native'
        ? { code: 'XLM' }
        : { code: reserveB?.asset?.split(':')[0], issuer: reserveB?.asset?.split(':')[1] }

      return {
        id: pool.id,
        assetA,
        assetB,
        reserveA: reserveA?.amount ?? '0',
        reserveB: reserveB?.amount ?? '0',
        totalShares: pool.total_shares ?? '0',
        fee: pool.fee_bp ?? 30,
      }
    })
  }

  /**
   * Get a specific liquidity pool by ID.
   */
  async getLiquidityPool(poolId: string): Promise<LiquidityPool> {
    const pool = await this.server.liquidityPools().liquidityPoolId(poolId).call()
    const [reserveA, reserveB] = (pool as any).reserves ?? []

    const parseAsset = (raw: string): Asset => {
      if (!raw || raw === 'native') return { code: 'XLM' }
      const [code, issuer] = raw.split(':')
      return { code, issuer }
    }

    return {
      id: (pool as any).id,
      assetA: parseAsset(reserveA?.asset),
      assetB: parseAsset(reserveB?.asset),
      reserveA: reserveA?.amount ?? '0',
      reserveB: reserveB?.amount ?? '0',
      totalShares: (pool as any).total_shares ?? '0',
      fee: (pool as any).fee_bp ?? 30,
    }
  }

  /**
   * Build a deposit-to-liquidity-pool transaction XDR (unsigned).
   * Caller signs and submits separately.
   */
  async buildLiquidityDepositXdr(
    accountId: string,
    poolId: string,
    maxAmountA: string,
    maxAmountB: string,
    minPrice: string,
    maxPrice: string
  ): Promise<string> {
    const account = await this.server.loadAccount(accountId)

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.liquidityPoolDeposit({
          liquidityPoolId: poolId,
          maxAmountA,
          maxAmountB,
          minPrice: { n: Math.round(parseFloat(minPrice) * 10_000_000), d: 10_000_000 },
          maxPrice: { n: Math.round(parseFloat(maxPrice) * 10_000_000), d: 10_000_000 },
        })
      )
      .setTimeout(30)
      .build()

    return tx.toXDR()
  }

  /**
   * Build a withdraw-from-liquidity-pool transaction XDR (unsigned).
   */
  async buildLiquidityWithdrawXdr(
    accountId: string,
    poolId: string,
    amount: string,
    minAmountA: string,
    minAmountB: string
  ): Promise<string> {
    const account = await this.server.loadAccount(accountId)

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        StellarSdk.Operation.liquidityPoolWithdraw({
          liquidityPoolId: poolId,
          amount,
          minAmountA,
          minAmountB,
        })
      )
      .setTimeout(30)
      .build()

    return tx.toXDR()
  }
}

export const stellarDEXService = new StellarDEXService()
