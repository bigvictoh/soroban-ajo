import { WebSocketServer } from '../websocket/server';

export class NotificationService {
  constructor(private wsServer: WebSocketServer) {}

  async notifyContribution(groupId: string, contribution: any): Promise<void> {
    this.wsServer.emitToGroup(groupId, 'contribution:new', {
      type: 'contribution',
      groupId,
      member: contribution.member,
      amount: contribution.amount,
      timestamp: Date.now()
    });

    // Also notify the contributor
    this.wsServer.emitToUser(contribution.memberId, 'contribution:confirmed', {
      groupId,
      amount: contribution.amount,
      timestamp: Date.now()
    });
  }

  async notifyPayout(groupId: string, payout: any): Promise<void> {
    this.wsServer.emitToGroup(groupId, 'payout:executed', {
      type: 'payout',
      groupId,
      recipient: payout.recipient,
      amount: payout.amount,
      timestamp: Date.now()
    });

    // Notify recipient
    this.wsServer.emitToUser(payout.recipientId, 'payout:received', {
      groupId,
      amount: payout.amount,
      timestamp: Date.now()
    });
  }

  async notifyDispute(groupId: string, dispute: any): Promise<void> {
    this.wsServer.emitToGroup(groupId, 'dispute:opened', {
      type: 'dispute',
      groupId,
      disputeId: dispute.id,
      reason: dispute.reason,
      timestamp: Date.now()
    });
  }

  async notifyMemberJoined(groupId: string, member: any): Promise<void> {
    this.wsServer.emitToGroup(groupId, 'member:joined', {
      type: 'member_joined',
      groupId,
      member: {
        id: member.id,
        name: member.name
      },
      timestamp: Date.now()
    });
  }

  async notifyMemberLeft(groupId: string, member: any): Promise<void> {
    this.wsServer.emitToGroup(groupId, 'member:left', {
      type: 'member_left',
      groupId,
      memberId: member.id,
      timestamp: Date.now()
    });
  }

  async notifyCycleComplete(groupId: string, cycle: any): Promise<void> {
    this.wsServer.emitToGroup(groupId, 'cycle:complete', {
      type: 'cycle_complete',
      groupId,
      cycleNumber: cycle.number,
      totalContributions: cycle.totalContributions,
      timestamp: Date.now()
    });
  }

  async notifyReminder(userId: string, reminder: any): Promise<void> {
    this.wsServer.emitToUser(userId, 'reminder', {
      type: 'reminder',
      message: reminder.message,
      groupId: reminder.groupId,
      dueDate: reminder.dueDate,
      timestamp: Date.now()
    });
  }

  async broadcastSystemMessage(message: string): Promise<void> {
    this.wsServer.broadcast('system:message', {
      type: 'system',
      message,
      timestamp: Date.now()
    });
  }
}
