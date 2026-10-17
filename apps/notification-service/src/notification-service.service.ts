import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'libs/prisma';
import { PaginationQueryDto, buildPaginatedResponse } from 'libs/common';
import { FirebaseService } from './firebase.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // FCM TOKEN REGISTRATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Called when a user logs in / the app starts up.
   * Saves the FCM device token so we know where to push.
   */
  async registerFcmToken(userId: string, fcmToken: string, role: string) {
    if (!fcmToken) return { ok: true };

    if (role === 'RIDER') {
      await this.prisma.riderProfile.updateMany({
        where: { userId },
        data: { fcmToken },
      });
    } else {
      await this.prisma.profile.updateMany({
        where: { userId },
        data: { fcmToken },
      });
    }

    // Optionally subscribe to a topic for broadcast pushes
    const topic = role === 'RIDER' ? 'riders' : 'customers';
    await this.firebase.subscribeToTopic(fcmToken, topic);

    this.logger.log(`FCM token registered for user ${userId} (${role})`);
    return { ok: true };
  }

  /**
   * Resolve the FCM token for a given user ID.
   * Checks both Profile and RiderProfile.
   */
  private async getFcmToken(userId: string): Promise<string | null> {
    // Check Profile first (customers / admins)
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { fcmToken: true },
    });
    if (profile?.fcmToken) return profile.fcmToken;

    // Try RiderProfile
    const riderProfile = await this.prisma.riderProfile.findUnique({
      where: { userId },
      select: { fcmToken: true },
    });
    return riderProfile?.fcmToken || null;
  }

  // ─────────────────────────────────────────────────────────────
  // SEND NOTIFICATION
  // ─────────────────────────────────────────────────────────────

  /**
   * Core method: persists the notification to DB and sends a Firebase push.
   * Called by other microservices via the internal POST /notifications endpoint.
   */
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: Record<string, string>,
  ) {
    this.logger.log(
      `Dispatching Notification [${type}] to user ${userId} → "${title}"`,
    );

    // 1. Persist to DB
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        status: 'SENT',
      },
    });

    // 2. Push via Firebase (non-blocking — failure never crashes the flow)
    try {
      const fcmToken = await this.getFcmToken(userId);
      if (fcmToken) {
        const pushData: Record<string, string> = {
          notificationId: notification.id,
          type,
          ...(data || {}),
        };
        const sent = await this.firebase.sendToToken(fcmToken, title, message, pushData);
        if (!sent) {
          // Token likely expired — clear it from DB
          await this.prisma.profile
            .updateMany({ where: { userId, fcmToken }, data: { fcmToken: null } })
            .catch(() => {});
          await this.prisma.riderProfile
            .updateMany({ where: { userId, fcmToken }, data: { fcmToken: null } })
            .catch(() => {});
        }
      } else {
        this.logger.debug(`No FCM token for user ${userId} — in-app only`);
      }
    } catch (err: any) {
      this.logger.warn(`FCM push attempt failed for ${userId}: ${err.message}`);
    }

    return notification;
  }

  /**
   * Broadcast a notification to ALL riders or ALL customers via FCM topic.
   * Also writes one notification record per user (if userIds list provided),
   * or a single "broadcast" record (if no list given).
   */
  async broadcastToTopic(
    topic: 'riders' | 'customers' | 'all',
    title: string,
    message: string,
    type: string,
    data?: Record<string, string>,
  ) {
    await this.firebase.sendToTopic(topic, title, message, {
      type,
      ...(data || {}),
    });

    // Persist one broadcast record
    return this.prisma.notification.create({
      data: {
        userId: `BROADCAST:${topic}`,
        title,
        message,
        type,
        status: 'SENT',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // QUERY / READ
  // ─────────────────────────────────────────────────────────────

  async getNotificationHistory(userId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId !== 'ALL') {
      where.userId = userId;
    }
    if (query.type) {
      where.type = query.type.toUpperCase();
    }
    if (query.status) {
      where.status = query.status.toUpperCase();
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const orderBy: any = {};
    orderBy[query.sort || 'createdAt'] = query.order || 'desc';

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(notifications, total, page, limit);
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'READ' },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, status: 'SENT' },
      data: { status: 'READ' },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, status: 'SENT' },
    });
  }
}
