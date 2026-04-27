import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { EventHandlers } from './handlers';
import { RoomManager } from './rooms';

export class WebSocketServer {
  private io: Server;
  private pubClient: ReturnType<typeof createClient>;
  private subClient: ReturnType<typeof createClient>;
  private roomManager: RoomManager;
  private eventHandlers: EventHandlers;

  async initialize(httpServer: any) {
    this.io = new Server(httpServer, {
      cors: { 
        origin: process.env.FRONTEND_URL || '*',
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Redis adapter for horizontal scaling
    if (process.env.REDIS_URL) {
      this.pubClient = createClient({ url: process.env.REDIS_URL });
      this.subClient = this.pubClient.duplicate();
      
      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect()
      ]);

      this.io.adapter(createAdapter(this.pubClient, this.subClient));
    }

    this.roomManager = new RoomManager();
    this.eventHandlers = new EventHandlers(this.roomManager);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket) => {
      this.eventHandlers.handleConnection(socket);
    });

    // Health check
    this.io.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  // Emit to specific user
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Emit to group members
  emitToGroup(groupId: string, event: string, data: any): void {
    this.io.to(`group:${groupId}`).emit(event, data);
  }

  // Broadcast to all connected clients
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // Get connection stats
  getStats(): any {
    return {
      connectedClients: this.io.sockets.sockets.size,
      rooms: this.roomManager.getRoomCount(),
      totalConnections: this.roomManager.getTotalConnections()
    };
  }

  // Close server
  async close(): Promise<void> {
    if (this.pubClient) {
      await this.pubClient.quit();
    }
    if (this.subClient) {
      await this.subClient.quit();
    }
    this.io.close();
  }
}
