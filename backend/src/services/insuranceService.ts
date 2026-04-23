import { SorobanService } from './sorobanService'
import * as StellarSdk from 'stellar-sdk'

export interface InsurancePool {
  balance: string
  totalPayouts: string
  pendingClaimsCount: number
}

export interface InsuranceClaim {
  id: string
  groupId: string
  cycle: number
  defaulter: string
  claimant: string
  amount: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  createdAt: number
}

export class InsuranceService {
  private sorobanService: SorobanService

  constructor() {
    this.sorobanService = new SorobanService()
  }

  /**
   * Retrieves the current state of a specific insurance pool from the blockchain.
   * 
   * @param tokenAddress - The Stellar asset/token address for the pool
   * @returns Promise resolving to an InsurancePool object with balance and claim stats
   */
  async getInsurancePool(tokenAddress: string): Promise<InsurancePool> {
    const args = [new StellarSdk.Address(tokenAddress).toScVal()]
    const result = await (this.sorobanService as any).simulateView('get_insurance_pool', args)
    
    if (!result) {
      return { balance: '0', totalPayouts: '0', pendingClaimsCount: 0 }
    }

    const map = this.decodeScMap(result)
    return {
      balance: map.balance || '0',
      totalPayouts: map.total_payouts || '0',
      pendingClaimsCount: Number(map.pending_claims_count || 0),
    }
  }

  /**
   * Initiates the filing of an insurance claim for a default event.
   * Returns an unsigned XDR for the user to sign if not already provided.
   * 
   * @param claimData - The claim details
   * @param claimData.claimant - Wallet address of the member filing the claim
   * @param claimData.groupId - The ID of the affected group
   * @param claimData.cycle - The cycle number where the default occurred
   * @param claimData.defaulter - Wallet address of the defaulting member
   * @param claimData.amount - The claim amount requested
   * @param claimData.signedXdr - Optional already signed XDR to submit immediately
   * @returns Promise resolving to an object containing the unsigned XDR or the submission result
   */
  async fileClaim(claimData: {
    claimant: string
    groupId: string
    cycle: number
    defaulter: string
    amount: string
    signedXdr?: string
  }) {
    const { claimant, groupId, cycle, defaulter, amount, signedXdr } = claimData

    if (signedXdr) {
      return this.sorobanService['submitSignedXdr'](signedXdr)
    }

    const args = [
      new StellarSdk.Address(claimant).toScVal(),
      StellarSdk.nativeToScVal(groupId, { type: 'u64' }),
      StellarSdk.nativeToScVal(cycle, { type: 'u32' }),
      new StellarSdk.Address(defaulter).toScVal(),
      StellarSdk.nativeToScVal(BigInt(amount), { type: 'i128' }),
    ]

    const unsignedXdr = await this.sorobanService['buildUnsignedTransaction'](
      claimant,
      'file_insurance_claim',
      args
    )
    return { unsignedXdr }
  }

  /**
   * Processes a pending insurance claim (approve or reject).
   * Usually performed by a system administrator or authorized DAO member.
   * 
   * @param processData - The processing instructions
   * @param processData.admin - Wallet address of the administrator
   * @param processData.claimId - The unique ID of the claim to process
   * @param processData.approved - Whether to approve or reject the claim
   * @param processData.signedXdr - Optional already signed XDR to submit
   * @returns Promise resolving to the unsigned XDR or submission result
   */
  async processClaim(processData: {
    admin: string
    claimId: string
    approved: boolean
    signedXdr?: string
  }) {
    const { admin, claimId, approved, signedXdr } = processData

    if (signedXdr) {
      return this.sorobanService['submitSignedXdr'](signedXdr)
    }

    const args = [
      new StellarSdk.Address(admin).toScVal(),
      StellarSdk.nativeToScVal(BigInt(claimId), { type: 'u64' }),
      StellarSdk.nativeToScVal(approved, { type: 'bool' }),
    ]

    const unsignedXdr = await this.sorobanService['buildUnsignedTransaction'](
      admin,
      'process_insurance_claim',
      args
    )
    return { unsignedXdr }
  }

  private decodeScMap(scVal: StellarSdk.xdr.ScVal): Record<string, string> {
    const result: Record<string, string> = {}
    const entries = scVal.map()
    if (!entries) return result

    for (const entry of entries) {
      const key = entry.key().str()?.toString() ?? entry.key().sym()?.toString() ?? ''
      result[key] = this.scValToString(entry.val())
    }

    return result
  }

  private scValToString(val: StellarSdk.xdr.ScVal): string {
    switch (val.switch().name) {
      case 'scvString':
        return val.str().toString()
      case 'scvSymbol':
        return val.sym().toString()
      case 'scvBool':
        return String(val.b())
      case 'scvU32':
        return String(val.u32())
      case 'scvU64':
        return val.u64().toString()
      case 'scvI128':
        return val.i128().lo().toString()
      case 'scvAddress':
        return StellarSdk.Address.fromScVal(val).toString()
      default:
        return val.toXDR('base64')
    }
  }
}

export const insuranceService = new InsuranceService()
