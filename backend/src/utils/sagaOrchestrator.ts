import { prisma } from '../config/database'

export interface SagaStep {
  name: string
  action: () => Promise<any>
  compensation: () => Promise<void>
}

export interface SagaState {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'compensating'
  steps: Array<{ name: string; status: 'pending' | 'completed' | 'failed' }>
  createdAt: Date
  updatedAt: Date
}

export class SagaOrchestrator {
  private sagas: Map<string, SagaState> = new Map()

  /**
   * Execute saga with automatic compensation on failure
   */
  async executeSaga(sagaId: string, sagaName: string, steps: SagaStep[]): Promise<void> {
    const sagaState: SagaState = {
      id: sagaId,
      name: sagaName,
      status: 'in-progress',
      steps: steps.map((s) => ({ name: s.name, status: 'pending' })),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    this.sagas.set(sagaId, sagaState)

    const completedSteps: SagaStep[] = []

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i]
        sagaState.steps[i].status = 'pending'

        try {
          await step.action()
          sagaState.steps[i].status = 'completed'
          completedSteps.push(step)
        } catch (error) {
          sagaState.steps[i].status = 'failed'
          throw error
        }
      }

      sagaState.status = 'completed'
    } catch (error) {
      sagaState.status = 'compensating'

      // Execute compensations in reverse order
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        try {
          await completedSteps[i].compensation()
        } catch (compensationError) {
          console.error(`Compensation failed for step ${completedSteps[i].name}:`, compensationError)
        }
      }

      sagaState.status = 'failed'
      throw error
    } finally {
      sagaState.updatedAt = new Date()
    }
  }

  /**
   * Get saga state
   */
  getSagaState(sagaId: string): SagaState | undefined {
    return this.sagas.get(sagaId)
  }

  /**
   * Cleanup completed sagas
   */
  cleanupCompletedSagas(maxAge: number = 3600000): void {
    const now = Date.now()
    for (const [id, state] of this.sagas.entries()) {
      if (
        (state.status === 'completed' || state.status === 'failed') &&
        now - state.updatedAt.getTime() > maxAge
      ) {
        this.sagas.delete(id)
      }
    }
  }
}

export const sagaOrchestrator = new SagaOrchestrator()
