import { Socket } from 'socket.io';
import { RoomManager } from './rooms';

export class EventHandlers {
  constructor(private roomManager: RoomManager) {}

  handleConnection(socket: Socket): void {
    console.log(`Client connected: ${socket.id}`);

    socket.on('authenticate', async (token: string) => {
      await this.handleAuthentication(socket, token);
    });

    socket.on('join:group', (groupId: string) => {
      this.handleJoinGroup(socket, groupId);
    });

    socket.on('leave:group', (groupId: string) => {
      this.handleLeaveGroup(socket, groupId);
    });

    socket.on('message:send', (data: any) => {
      this.handleMessage(socket, data);
    });

    socket.on('disconnect', () => {
      this.handleDisconnect(socket);
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  private async handleAuthentication(socket: Socket, token: string): Promise<void> {
    try {
      const user = await this.verifyToken(token);
      if (user) {
        socket.data.userId = user.id;
        socket.data.authenticated = true;
        socket.join(`user:${user.id}`);

        // Auto-join user's groups
        const groups = await this.getUserGroups(user.id);
        groups.forEach(g => {
          socket.join(`group:${g.id}`);
          this.roomManager.joinRoom(socket.id, `group:${g.id}`);
        });

        socket.emit('authenticated', { userId: user.id });
      } else {
        socket.emit('auth:error', { message: 'Invalid token' });
      }
    } catch (error) {
      socket.emit('auth:error', { message: 'Authentication failed' });
    }
  }

  private handleJoinGroup(socket: Socket, groupId: string): void {
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    socket.join(`group:${groupId}`);
    this.roomManager.joinRoom(socket.id, `group:${groupId}`);
    socket.emit('joined:group', { groupId });
  }

  private handleLeaveGroup(socket: Socket, groupId: string): void {
    socket.leave(`group:${groupId}`);
    this.roomManager.leaveRoom(socket.id, `group:${groupId}`);
    socket.emit('left:group', { groupId });
  }

  private handleMessage(socket: Socket, data: any): void {
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    const { roomId, message } = data;
    socket.to(roomId).emit('message:received', {
      from: socket.data.userId,
      message,
      timestamp: Date.now()
    });
  }

  private handleDisconnect(socket: Socket): void {
    console.log(`Client disconnected: ${socket.id}`);
    this.roomManager.leaveAllRooms(socket.id);
  }

  private async verifyToken(token: string): Promise<any> {
    // Implementation
    return { id: 'user-123', name: 'Test User' };
  }

  private async getUserGroups(userId: string): Promise<any[]> {
    // Implementation
    return [];
  }
}
