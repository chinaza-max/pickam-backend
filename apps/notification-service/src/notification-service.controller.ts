import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { NotificationService } from './notification-service.service';
import { AuthGuard } from 'libs/guards';
import { CurrentUser, Public } from 'libs/decorators';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { PaginationQueryDto } from 'libs/common';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationServiceController {
  constructor(private readonly notificationService: NotificationService) {}

  // ─────────────────────────────────────────────────────────────
  // INTERNAL — called by other microservices (no auth required)
  // ─────────────────────────────────────────────────────────────

  @Public()
  @Post()
  @ApiOperation({ summary: 'Internal: Dispatch a notification to a user (persists + FCM push)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'title', 'message', 'type'],
      properties: {
        userId: { type: 'string' },
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', example: 'ORDER_ASSIGNED' },
        data: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  })
  async sendNotification(
    @Body('userId') userId: string,
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('type') type: string,
    @Body('data') data?: Record<string, string>,
  ) {
    if (!userId || !title || !message || !type) {
      throw new BadRequestException('userId, title, message, and type are required');
    }
    return this.notificationService.sendNotification(userId, title, message, type, data);
  }

  @Public()
  @Post('broadcast')
  @ApiOperation({ summary: 'Internal/Admin: Broadcast a push to all riders, customers, or all via FCM topic' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['topic', 'title', 'message', 'type'],
      properties: {
        topic: { type: 'string', enum: ['riders', 'customers', 'all'] },
        title: { type: 'string' },
        message: { type: 'string' },
        type: { type: 'string', example: 'BROADCAST' },
      },
    },
  })
  async broadcast(
    @Body('topic') topic: 'riders' | 'customers' | 'all',
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('type') type: string,
    @Body('data') data?: Record<string, string>,
  ) {
    if (!topic || !title || !message || !type) {
      throw new BadRequestException('topic, title, message, and type are required');
    }
    return this.notificationService.broadcastToTopic(topic, title, message, type, data);
  }

  // ─────────────────────────────────────────────────────────────
  // FCM TOKEN — called by mobile/web apps after login
  // ─────────────────────────────────────────────────────────────

  @Post('fcm-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or refresh FCM device token for push notifications' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fcmToken'],
      properties: {
        fcmToken: { type: 'string', description: 'Firebase Cloud Messaging device token' },
      },
    },
  })
  async registerFcmToken(
    @CurrentUser() user: any,
    @Body('fcmToken') fcmToken: string,
  ) {
    if (!fcmToken) {
      throw new BadRequestException('fcmToken is required');
    }
    return this.notificationService.registerFcmToken(user.sub || user.id, fcmToken, user.role);
  }

  // ─────────────────────────────────────────────────────────────
  // USER-FACING (authenticated)
  // ─────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retrieve the current user's paginated notification history" })
  async getMyNotifications(
    @CurrentUser() user: any,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationService.getNotificationHistory(user.sub || user.id, query);
  }

  @Get('me/unread-count')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get count of unread notifications for the current user" })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationService.getUnreadCount(user.sub || user.id);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiParam({ name: 'id', type: 'string' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.notificationService.markAsRead(id, user.sub || user.id);
  }

  @Patch('me/read-all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  async markAllAsRead(@CurrentUser() user: any) {
    return this.notificationService.markAllAsRead(user.sub || user.id);
  }

  // ─────────────────────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({ summary: 'Internal/Admin: List all notifications (paginated)' })
  async getAllNotifications(@Query() query: PaginationQueryDto & { userId?: string }) {
    const targetUserId = query.userId || 'ALL';
    return this.notificationService.getNotificationHistory(targetUserId, query);
  }
}
