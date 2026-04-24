/**
 * Central entry point for all custom React hooks.
 * Exports hooks for state management, blockchain interaction, and UI utilities.
 */
export { useOfflineMode } from './useOfflineMode'
export type { UseOfflineModeReturn } from './useOfflineMode'
export { useOfflineContext, OfflineProvider } from '@/context/OfflineContext'
export { useTableState } from './useTableState'
export type { TableFilters, UseTableStateOptions, UseTableStateReturn } from './useTableState'
export { useSkeletonDelay } from './useSkeletonDelay'
export { useTransactionHistory } from './useTransactionHistory'
export type { TxRow, TxFilters, TxSort, PageSizeOption } from './useTransactionHistory'
export { useGroupAnalytics } from './useGroupAnalytics'
export type { AnalyticsSummary, ContributionTrend, MemberStat, GroupPerformance, TopContributor } from './useGroupAnalytics'
export { useInvitations } from './useInvitations'
export type { Invitation, InvitationDraft, InvitationStatus, InvitationDirection, InvitationChannel } from './useInvitations'

export { useToast } from './useToast'
export type { ToastOptions, ToastAction } from './useToast'

// Penalty hooks
export {
    useMemberPenaltyRecord,
    useGroupPenaltyStats,
    usePenaltyHistory,
    useUserPenaltyRecords,
    usePenaltyCacheInvalidation,
    usePenaltyPrefetch,
    getReliabilityScoreColor,
    getReliabilityScoreLabel
} from './usePenaltyStats'
export type {
    MemberPenaltyRecord,
    PenaltyStats,
    PenaltyHistoryItem
} from '../types'
