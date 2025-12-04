import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '@/lib/db';
import { cache } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { NotificationType } from '@prisma/client';

let io: SocketIOServer | null = null;

export interface SocketUser {
  userId: string;
  profileId: string;
  role: string;
  socketId: string;
}

interface ExtendedSocket extends Socket {
  userData?: Omit<SocketUser, 'socketId'>;
}

export class RealtimeService {
  private static connectedUsers = new Map<string, SocketUser>();

  /**
   * Initialize Socket.io server
   */
  static initialize(httpServer: HTTPServer): SocketIOServer {
    if (io) return io;

    io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const sessionId = socket.handshake.auth.sessionId;

        if (!sessionId) {
          return next(new Error('Authentication required'));
        }

        // Validate session
        const result = await lucia.validateSession(sessionId);

        if (!result.session || !result.user) {
          return next(new Error('Invalid session'));
        }

        // Get user profile
        const profile = await prisma.profile.findUnique({
          where: { userId: result.user.id },
        });

        if (!profile) {
          return next(new Error('Profile not found'));
        }

        // Attach user data to socket
        const extendedSocket = socket as ExtendedSocket;
        extendedSocket.userData = {
          userId: result.user.id,
          profileId: profile.id,
          role: profile.role,
        };

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    io.on('connection', (socket) => {
      const extendedSocket = socket as ExtendedSocket;
      const userData: SocketUser = {
        ...extendedSocket.userData!,
        socketId: socket.id,
      };

      this.handleConnection(socket, userData);
    });

    return io;
  }

  /**
   * Handle new socket connection
   */
  private static handleConnection(socket: Socket, userData: SocketUser) {
    logger.info(`User connected: ${userData.userId} (${userData.role})`);

    // Store connected user
    this.connectedUsers.set(socket.id, userData);

    // Join user to their personal room
    socket.join(`user:${userData.userId}`);
    socket.join(`profile:${userData.profileId}`);
    socket.join(`role:${userData.role}`);

    // Set up event handlers
    this.setupEventHandlers(socket, userData);

    // Send initial data
    this.sendInitialData(socket, userData);

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${userData.userId}`);
      this.connectedUsers.delete(socket.id);
      this.updateUserPresence(userData.userId, false);
    });

    // Update user presence
    this.updateUserPresence(userData.userId, true);
  }

  /**
   * Set up socket event handlers
   */
  private static setupEventHandlers(socket: Socket, userData: SocketUser) {
    // Chat message
    socket.on('chat:message', async (data) => {
      await this.handleChatMessage(socket, userData, data);
    });

    // Typing indicator
    socket.on('chat:typing', async (data) => {
      await this.handleTypingIndicator(socket, userData, data);
    });

    // Join chat room
    socket.on('chat:join', async (roomId) => {
      await this.handleJoinRoom(socket, userData, roomId);
    });

    // Leave chat room
    socket.on('chat:leave', async (roomId) => {
      await this.handleLeaveRoom(socket, userData, roomId);
    });

    // Mark notification as read
    socket.on('notification:read', async (notificationId) => {
      await this.handleNotificationRead(userData, notificationId);
    });

    // Request refresh of stats
    socket.on('stats:refresh', async () => {
      await this.sendUpdatedStats(socket, userData);
    });
  }

  /**
   * Send initial data to connected user
   */
  private static async sendInitialData(socket: Socket, userData: SocketUser) {
    try {
      // Send unread notifications
      const notifications = await prisma.notification.findMany({
        where: {
          profileId: userData.profileId,
          isRead: false,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      socket.emit('notifications:initial', notifications);

      // Send online users count
      const onlineCount = this.connectedUsers.size;
      socket.emit('users:online', onlineCount);

      // If referrer, send real-time stats
      if (userData.role === 'REFERRER') {
        await this.sendUpdatedStats(socket, userData);
      }
    } catch (error) {
      logger.error('Error sending initial data:', error);
    }
  }

  /**
   * Handle chat message
   */
  private static async handleChatMessage(
    socket: Socket,
    userData: SocketUser,
    data: { roomId: string; message: string }
  ) {
    try {
      // Validate user is participant of the room
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          roomId_profileId: {
            roomId: data.roomId,
            profileId: userData.profileId,
          },
        },
      });

      if (!participant) {
        socket.emit('error', { message: 'Not a member of this chat' });
        return;
      }

      // Save message
      const message = await prisma.chatMessage.create({
        data: {
          roomId: data.roomId,
          senderId: userData.profileId,
          content: data.message,
        },
        include: {
          room: {
            include: {
              participants: true,
            },
          },
        },
      });

      // Broadcast to all room participants
      message.room.participants.forEach((p) => {
        io?.to(`profile:${p.profileId}`).emit('chat:message', {
          roomId: data.roomId,
          message: {
            id: message.id,
            senderId: message.senderId,
            content: message.content,
            createdAt: message.createdAt,
          },
        });
      });

      // Update last read for sender
      await prisma.chatParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      });
    } catch (error) {
      logger.error('Chat message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle typing indicator
   */
  private static async handleTypingIndicator(
    socket: Socket,
    userData: SocketUser,
    data: { roomId: string; isTyping: boolean }
  ) {
    try {
      // Broadcast to room except sender
      socket.to(`room:${data.roomId}`).emit('chat:typing', {
        roomId: data.roomId,
        userId: userData.userId,
        profileId: userData.profileId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      logger.error('Typing indicator error:', error);
    }
  }

  /**
   * Handle join room
   */
  private static async handleJoinRoom(socket: Socket, userData: SocketUser, roomId: string) {
    try {
      // Verify user is participant
      const participant = await prisma.chatParticipant.findUnique({
        where: {
          roomId_profileId: {
            roomId,
            profileId: userData.profileId,
          },
        },
      });

      if (!participant) {
        socket.emit('error', { message: 'Not a member of this room' });
        return;
      }

      // Join socket room
      socket.join(`room:${roomId}`);

      // Get recent messages
      const messages = await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      socket.emit('chat:history', {
        roomId,
        messages: messages.reverse(),
      });

      // Notify others that user joined
      socket.to(`room:${roomId}`).emit('chat:user-joined', {
        roomId,
        userId: userData.userId,
        profileId: userData.profileId,
      });
    } catch (error) {
      logger.error('Join room error:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle leave room
   */
  private static async handleLeaveRoom(socket: Socket, userData: SocketUser, roomId: string) {
    socket.leave(`room:${roomId}`);

    // Notify others that user left
    socket.to(`room:${roomId}`).emit('chat:user-left', {
      roomId,
      userId: userData.userId,
      profileId: userData.profileId,
    });
  }

  /**
   * Handle notification read
   */
  private static async handleNotificationRead(userData: SocketUser, notificationId: string) {
    try {
      await prisma.notification.update({
        where: {
          id: notificationId,
          profileId: userData.profileId,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Mark notification read error:', error);
    }
  }

  /**
   * Send updated stats to referrer
   */
  private static async sendUpdatedStats(socket: Socket, userData: SocketUser) {
    if (userData.role !== 'REFERRER') return;

    try {
      // Get fresh stats (bypassing cache)
      const stats = await prisma.referral.findMany({
        where: { referrerId: userData.profileId },
      });

      const totalReferrals = stats.length;
      const completedReturns = stats.filter((r) => r.status === 'COMPLETED').length;
      const totalEarnings = stats.reduce((sum, r) => sum + Number(r.commissionEarned || 0), 0);

      socket.emit('stats:update', {
        total_referrals: totalReferrals,
        completed_returns: completedReturns,
        total_earnings: totalEarnings,
      });
    } catch (error) {
      logger.error('Send stats error:', error);
    }
  }

  /**
   * Update user presence
   */
  private static async updateUserPresence(userId: string, isOnline: boolean) {
    const key = `presence:${userId}`;
    if (isOnline) {
      await cache.set(key, { online: true, lastSeen: new Date() }, 300); // 5 minutes
    } else {
      await cache.del(key);
    }

    // Broadcast presence update
    io?.emit('presence:update', {
      userId,
      isOnline,
    });
  }

  /**
   * Send notification to specific user
   */
  static async sendNotification(
    profileId: string,
    notification: {
      type: NotificationType;
      title: string;
      message: string;
      actionUrl?: string;
    }
  ) {
    try {
      // Save notification to database
      const savedNotification = await prisma.notification.create({
        data: {
          profileId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
        },
      });

      // Send via Socket.io if user is online
      io?.to(`profile:${profileId}`).emit('notification:new', savedNotification);

      return savedNotification;
    } catch (error) {
      logger.error('Send notification error:', error);
      return null;
    }
  }

  /**
   * Broadcast to role
   */
  static broadcastToRole(role: string, event: string, data: unknown) {
    io?.to(`role:${role}`).emit(event, data);
  }

  /**
   * Get online users count
   */
  static getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get online users by role
   */
  static getOnlineUsersByRole(role: string): SocketUser[] {
    return Array.from(this.connectedUsers.values()).filter((u) => u.role === role);
  }
}
