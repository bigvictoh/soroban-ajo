import { randomUUID } from 'crypto'
import { prisma } from '../config/database'
import { DomainEvent, StoredEvent, EventType } from './types'
import logger from '../utils/logger'

export class EventStore {
  async append(event: Omit<DomainEvent, 'id'>): Promise<StoredEvent> {
    const id = randomUUID()
    const stored = await prisma.eventStore.create({
      data: {
        id,
        type: event.type,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        payload: event.payload as object,
        metadata: event.metadata as object,
        version: event.metadata.version,
      },
    })

    logger.info('Event appended', { id, type: event.type, aggregateId: event.aggregateId })

    return {
      ...event,
      id,
      sequenceNumber: stored.sequenceNumber,
      createdAt: stored.createdAt,
    }
  }

  async getByAggregateId(aggregateId: string, fromVersion = 0): Promise<StoredEvent[]> {
    const events = await prisma.eventStore.findMany({
      where: { aggregateId, version: { gte: fromVersion } },
      orderBy: { sequenceNumber: 'asc' },
    })

    return events.map(this.toStoredEvent)
  }

  async getByType(type: EventType, limit = 100): Promise<StoredEvent[]> {
    const events = await prisma.eventStore.findMany({
      where: { type },
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
    })

    return events.map(this.toStoredEvent)
  }

  async getAll(fromSequence = 0, limit = 100): Promise<StoredEvent[]> {
    const events = await prisma.eventStore.findMany({
      where: { sequenceNumber: { gt: fromSequence } },
      orderBy: { sequenceNumber: 'asc' },
      take: limit,
    })

    return events.map(this.toStoredEvent)
  }

  private toStoredEvent(raw: {
    id: string
    type: string
    aggregateId: string
    aggregateType: string
    payload: unknown
    metadata: unknown
    version: number
    sequenceNumber: number
    createdAt: Date
  }): StoredEvent {
    const meta = raw.metadata as { userId?: string; timestamp: string; version: number; correlationId?: string }
    return {
      id: raw.id,
      type: raw.type as EventType,
      aggregateId: raw.aggregateId,
      aggregateType: raw.aggregateType,
      payload: raw.payload as Record<string, unknown>,
      metadata: meta,
      sequenceNumber: raw.sequenceNumber,
      createdAt: raw.createdAt,
    }
  }
}

export const eventStore = new EventStore()
