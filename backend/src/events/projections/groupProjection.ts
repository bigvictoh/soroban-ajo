import { Projection, StoredEvent } from '../types'

export interface GroupState {
  id: string
  name: string
  memberCount: number
  totalContributions: number
  status: 'active' | 'inactive'
  version: number
}

export const groupProjection: Projection<GroupState | null> = {
  name: 'GroupProjection',
  initialState: null,

  apply(state: GroupState | null, event: StoredEvent): GroupState | null {
    const base = state ?? {
      id: event.aggregateId,
      name: '',
      memberCount: 0,
      totalContributions: 0,
      status: 'active' as const,
      version: 0,
    }

    switch (event.type) {
      case 'GROUP_CREATED':
        return {
          ...base,
          id: event.aggregateId,
          name: (event.payload as { name: string }).name ?? '',
          status: 'active',
          version: event.metadata.version,
        }
      case 'MEMBER_JOINED':
        return { ...base, memberCount: base.memberCount + 1, version: event.metadata.version }
      case 'MEMBER_LEFT':
        return { ...base, memberCount: Math.max(0, base.memberCount - 1), version: event.metadata.version }
      case 'CONTRIBUTION_MADE':
        return {
          ...base,
          totalContributions: base.totalContributions + ((event.payload as { amount: number }).amount ?? 0),
          version: event.metadata.version,
        }
      default:
        return base
    }
  },
}
