import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'libs/prisma';
import { PaginationQueryDto, buildPaginatedResponse } from 'libs/common';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
  ) {
    this.logger.log(
      `Dispatching Notification [${type}] to user ${userId} -> Title: "${title}", Message: "${message}"`,
    );

    // Write to notification_schema
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        status: 'SENT',
      },
    });

    return notification;
  }

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
}
