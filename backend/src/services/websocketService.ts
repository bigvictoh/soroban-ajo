/**
 * WebSocketService
 *
 * Thin wrapper that initialises the /notifications namespace on an existing
 * Socket.IO server instance (shared with chatService).
 */
import { notificationService } from './notificationService'
import { logger } from '../utils/logger'

class WebSocketService {
  /**
   * Attaches the notification namespace to an existing Socket.IO server.
   * Should be called during system startup, after chat service initialization.
   *
   * @param io - The shared Socket.IO Server instance (or null if not yet ready)
   */
  init(io: any) {
    if (!io) {
      logger.warn('WebSocketService: no Socket.IO instance provided — notifications disabled')
      return
    }
    notificationService.init(io)
    logger.info('WebSocketService: notification namespace attached')
  }
}

export const websocketService = new WebSocketService()
