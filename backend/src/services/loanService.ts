import { SorobanService } from './sorobanService'
import * as StellarSdk from 'stellar-sdk'

export interface LoanRequest {
  id: string
  groupId: string
  borrower: string
  amount: string
  interestRateBps: number
  repaymentPeriod: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'REPAID' | 'DEFAULTED'
  votesFor: number
  votesAgainst: number
  votingDeadline: number
  createdAt: number
  disbursedAt: number
  amountRepaid: string
  dueAt: number
}

export class LoanService {
  private soroban: SorobanService

  constructor() {
    this.soroban = new SorobanService()
  }

  async requestLoan(data: {
    caller: string
    groupId: string
    amount: string
    interestRateBps: number
    repaymentPeriod: number
    signedXdr?: string
  }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [
      StellarSdk.nativeToScVal(BigInt(data.groupId), { type: 'u64' }),
      new StellarSdk.Address(data.caller).toScVal(),
      StellarSdk.nativeToScVal(BigInt(data.amount), { type: 'i128' }),
      StellarSdk.nativeToScVal(data.interestRateBps, { type: 'u32' }),
      StellarSdk.nativeToScVal(BigInt(data.repaymentPeriod), { type: 'u64' }),
    ]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.caller, 'request_loan', args)
    return { unsignedXdr }
  }

  async voteOnLoan(data: {
    voter: string
    loanId: string
    inFavor: boolean
    signedXdr?: string
  }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [
      StellarSdk.nativeToScVal(BigInt(data.loanId), { type: 'u64' }),
      new StellarSdk.Address(data.voter).toScVal(),
      StellarSdk.nativeToScVal(data.inFavor, { type: 'bool' }),
    ]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.voter, 'vote_on_loan', args)
    return { unsignedXdr }
  }

  async disburseLoan(data: { caller: string; loanId: string; signedXdr?: string }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [StellarSdk.nativeToScVal(BigInt(data.loanId), { type: 'u64' })]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.caller, 'disburse_loan', args)
    return { unsignedXdr }
  }

  async repayLoan(data: {
    borrower: string
    loanId: string
    amount: string
    signedXdr?: string
  }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [
      StellarSdk.nativeToScVal(BigInt(data.loanId), { type: 'u64' }),
      new StellarSdk.Address(data.borrower).toScVal(),
      StellarSdk.nativeToScVal(BigInt(data.amount), { type: 'i128' }),
    ]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.borrower, 'repay_loan', args)
    return { unsignedXdr }
  }

  async getLoan(loanId: string): Promise<LoanRequest | null> {
    const args = [StellarSdk.nativeToScVal(BigInt(loanId), { type: 'u64' })]
    const result = await (this.soroban as any).simulateView('get_loan', args)
    if (!result) return null
    return this.decodeLoan(result)
  }

  async getGroupLoans(groupId: string): Promise<string[]> {
    const args = [StellarSdk.nativeToScVal(BigInt(groupId), { type: 'u64' })]
    const result = await (this.soroban as any).simulateView('get_group_loans', args)
    if (!result) return []
    const vec = result.vec()
    if (!vec) return []
    return vec.map((v: StellarSdk.xdr.ScVal) => v.u64().toString())
  }

  private decodeLoan(scVal: StellarSdk.xdr.ScVal): LoanRequest {
    const map: Record<string, string> = {}
    const entries = scVal.map()
    if (entries) {
      for (const e of entries) {
        const key = e.key().sym()?.toString() ?? ''
        map[key] = e.val().u64?.()?.toString() ?? e.val().i128?.()?.lo?.()?.toString() ?? e.val().u32?.()?.toString() ?? ''
      }
    }
    return {
      id: map['id'] ?? '',
      groupId: map['group_id'] ?? '',
      borrower: map['borrower'] ?? '',
      amount: map['amount'] ?? '0',
      interestRateBps: Number(map['interest_rate_bps'] ?? 0),
      repaymentPeriod: Number(map['repayment_period'] ?? 0),
      status: (map['status'] as LoanRequest['status']) ?? 'PENDING',
      votesFor: Number(map['votes_for'] ?? 0),
      votesAgainst: Number(map['votes_against'] ?? 0),
      votingDeadline: Number(map['voting_deadline'] ?? 0),
      createdAt: Number(map['created_at'] ?? 0),
      disbursedAt: Number(map['disbursed_at'] ?? 0),
      amountRepaid: map['amount_repaid'] ?? '0',
      dueAt: Number(map['due_at'] ?? 0),
    }
  }
}

export const loanService = new LoanService()
