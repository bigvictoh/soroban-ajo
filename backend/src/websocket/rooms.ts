export class RoomManager {
  private rooms: Map<string, Set<string>> = new Map();

  joinRoom(socketId: string, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(socketId);
  }

  leaveRoom(socketId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  leaveAllRooms(socketId: string): void {
    this.rooms.forEach((members, roomId) => {
      members.delete(socketId);
      if (members.size === 0) {
        this.rooms.delete(roomId);
      }
    });
  }

  getRoomMembers(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || []);
  }

  getUserRooms(socketId: string): string[] {
    const userRooms: string[] = [];
    this.rooms.forEach((members, roomId) => {
      if (members.has(socketId)) {
        userRooms.push(roomId);
      }
    });
    return userRooms;
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getTotalConnections(): number {
    let total = 0;
    this.rooms.forEach(members => {
      total += members.size;
    });
    return total;
  }
}
