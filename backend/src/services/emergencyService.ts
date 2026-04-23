import { SorobanService } from './sorobanService'
import * as StellarSdk from 'stellar-sdk'

export interface EmergencyRequest {
  id: string
  groupId: string
  requester: string
  amount: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'REPAID'
  votesFor: number
  votesAgainst: number
  votingDeadline: number
  createdAt: number
  disbursedAt: number
  amountRepaid: string
  repayBy: number
}

export class EmergencyService {
  private soroban: SorobanService

  constructor() {
    this.soroban = new SorobanService()
  }

  async requestEmergency(data: {
    caller: string
    groupId: string
    amount: string
    reason: string
    repayPeriod: number
    signedXdr?: string
  }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [
      StellarSdk.nativeToScVal(BigInt(data.groupId), { type: 'u64' }),
      new StellarSdk.Address(data.caller).toScVal(),
      StellarSdk.nativeToScVal(BigInt(data.amount), { type: 'i128' }),
      StellarSdk.nativeToScVal(data.reason, { type: 'string' }),
      StellarSdk.nativeToScVal(BigInt(data.repayPeriod), { type: 'u64' }),
    ]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.caller, 'request_emergency', args)
    return { unsignedXdr }
  }

  async voteOnEmergency(data: {
    voter: string
    reqId: string
    inFavor: boolean
    signedXdr?: string
  }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [
      StellarSdk.nativeToScVal(BigInt(data.reqId), { type: 'u64' }),
      new StellarSdk.Address(data.voter).toScVal(),
      StellarSdk.nativeToScVal(data.inFavor, { type: 'bool' }),
    ]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.voter, 'vote_on_emergency', args)
    return { unsignedXdr }
  }

  async disburseEmergency(data: { caller: string; reqId: string; repayPeriod: number; signedXdr?: string }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [
      StellarSdk.nativeToScVal(BigInt(data.reqId), { type: 'u64' }),
      StellarSdk.nativeToScVal(BigInt(data.repayPeriod), { type: 'u64' }),
    ]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.caller, 'disburse_emergency', args)
    return { unsignedXdr }
  }

  async repayEmergency(data: { requester: string; reqId: string; amount: string; signedXdr?: string }) {
    if (data.signedXdr) {
      return (this.soroban as any).submitSignedXdr(data.signedXdr)
    }
    const args = [
      StellarSdk.nativeToScVal(BigInt(data.reqId), { type: 'u64' }),
      new StellarSdk.Address(data.requester).toScVal(),
      StellarSdk.nativeToScVal(BigInt(data.amount), { type: 'i128' }),
    ]
    const unsignedXdr = await (this.soroban as any).buildUnsignedTransaction(data.requester, 'repay_emergency', args)
    return { unsignedXdr }
  }

  async getEmergencyRequest(reqId: string): Promise<EmergencyRequest | null> {
    const args = [StellarSdk.nativeToScVal(BigInt(reqId), { type: 'u64' })]
    const result = await (this.soroban as any).simulateView('get_emergency_request', args)
    if (!result) return null
    return this.decodeRequest(result)
  }

  async getGroupEmergencies(groupId: string): Promise<string[]> {
    const args = [StellarSdk.nativeToScVal(BigInt(groupId), { type: 'u64' })]
    const result = await (this.soroban as any).simulateView('get_group_emergencies', args)
    if (!result) return []
    const vec = result.vec()
    if (!vec) return []
    return vec.map((v: StellarSdk.xdr.ScVal) => v.u64().toString())
  }

  private decodeRequest(scVal: StellarSdk.xdr.ScVal): EmergencyRequest {
    const map: Record<string, string> = {}
    const entries = scVal.map()
    if (entries) {
      for (const e of entries) {
        const key = e.key().sym()?.toString() ?? ''
        map[key] = e.val().u64?.()?.toString() ?? e.val().i128?.()?.lo?.()?.toString() ?? e.val().u32?.()?.toString() ?? e.val().str?.()?.toString() ?? ''
      }
    }
    return {
      id: map['id'] ?? '',
      groupId: map['group_id'] ?? '',
      requester: map['requester'] ?? '',
      amount: map['amount'] ?? '0',
      reason: map['reason'] ?? '',
      status: (map['status'] as EmergencyRequest['status']) ?? 'PENDING',
      votesFor: Number(map['votes_for'] ?? 0),
      votesAgainst: Number(map['votes_against'] ?? 0),
      votingDeadline: Number(map['voting_deadline'] ?? 0),
      createdAt: Number(map['created_at'] ?? 0),
      disbursedAt: Number(map['disbursed_at'] ?? 0),
      amountRepaid: map['amount_repaid'] ?? '0',
      repayBy: Number(map['repay_by'] ?? 0),
    }
  }
}

export const emergencyService = new EmergencyService()
