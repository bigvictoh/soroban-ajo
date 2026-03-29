import { StoredEvent, Projection } from '../types'
import { groupProjection, GroupState } from './groupProjection'
import { eventStore } from '../eventStore'

export async function rebuildProjection<T>(
  aggregateId: string,
  projection: Projection<T>
): Promise<T> {
  const events = await eventStore.getByAggregateId(aggregateId)
  return events.reduce(projection.apply.bind(projection), projection.initialState)
}

export async function rebuildGroupState(groupId: string): Promise<GroupState | null> {
  return rebuildProjection(groupId, groupProjection)
}

export { groupProjection }
