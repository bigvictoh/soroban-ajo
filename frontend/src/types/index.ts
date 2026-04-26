// Type definitions for Soroban Ajo

export interface Group {
  id: string
  name: string
  description?: string
  creator: string
  cycleLength: number
  contributionAmount: number
  maxMembers: number
  currentMembers: number
  totalContributions: number
  status: 'active' | 'completed' | 'paused'
  createdAt: string
  nextPayoutDate: string
  frequency?: 'weekly' | 'monthly'
  duration?: number
  invitedMembers?: string[]
  category?: string
  isBookmarked?: boolean
  /** 0–100 percentage of cycles completed on time */
  successRate?: number
  /** Average days from cycle end to payout */
  avgPayoutDays?: number
  /** 0–100 community reputation score */
  reputationScore?: number
}

export interface Member {
  address: string
  groupId: string
  joinedDate: string
  contributions: number
  totalContributed: number
  cyclesCompleted: number
  status: 'active' | 'inactive' | 'completed'
}

export interface Transaction {
  id: string
  groupId: string
  member: string
  amount: number
  type: 'contribution' | 'payout' | 'refund'
  timestamp: string
  date?: string // Fallback for components transitioning to timestamp
  status: 'pending' | 'confirmed' | 'failed' | 'completed'
}

export interface GroupStatus {
  groupId: string
  currentCycle: number
  nextRecipient: string
  pendingContributions: number
  totalCollected: number
  daysUntilPayout: number
}

export interface WalletConnection {
  isConnected: boolean
  address?: string
  network: 'testnet' | 'mainnet'
  balance?: number
}

export interface TransactionFilters {
  dateRange?: {
    start: string
    end: string
  }
  type?: 'contribution' | 'payout' | 'refund' | 'all'
  member?: string
  status?: 'pending' | 'confirmed' | 'failed' | 'all'
}

export type TransactionSortField = 'date' | 'amount' | 'member' | 'type'
export type SortDirection = 'asc' | 'desc'

export interface TransactionSort {
  field: TransactionSortField
  direction: SortDirection
}

export interface ValidationError {
  field: string
  message: string
}

export interface ContributionValidation {
  isValid: boolean
  errors: ValidationError[]
}

export interface ContributionFormData {
  amount: number
  groupId: string
  userBalance?: number
  requiredAmount: number
  hasExistingContribution?: boolean
  lastContributionDate?: string
}

export interface SorobanTransactionResponse {
  hash: string
  status: 'pending' | 'success' | 'failed'
}

export interface ContractInvocationResult {
  returnValue: unknown
  simulatedFootprint: unknown
}

export interface MemberPenaltyRecord {
  member: string
  groupId: string
  lateCount: number
  onTimeCount: number
  totalPenalties: number
  reliabilityScore: number
}

export interface PenaltyStats {
  totalPenalties: number
  averageReliabilityScore: number
  totalLateContributions: number
  totalOnTimeContributions: number
  membersWithPenalties: number
  totalMembers: number
}

export interface PenaltyHistoryItem {
  id: string
  groupId: string
  member: string
  cycle: number
  penaltyAmount: number
  isLate: boolean
  timestamp: string
  reason?: string
}

// Re-export profile types
export type { UserProfile, UserPreferences, UserStats, ActivityItem } from './profile'
