import { Controller, Post, Get, Body, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification-service.service';
import { AuthGuard } from 'libs/guards';
import { CurrentUser, Public } from 'libs/decorators';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from 'libs/common';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationServiceController {
  constructor(private readonly notificationService: NotificationService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Internal: Dispatch a notification to a user' })
  async sendNotification(
    @Body('userId') userId: string,
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('type') type: string,
  ) {
    if (!userId || !title || !message || !type) {
      throw new BadRequestException('userId, title, message, and type are required');
    }
    return this.notificationService.sendNotification(userId, title, message, type);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve paginated notification history of the current user' })
  async getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationService.getNotificationHistory(userId, query);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Internal/Admin: list all notifications (paginated)' })
  async getAllNotifications(@Query() query: PaginationQueryDto & { userId?: string }) {
    const targetUserId = query.userId || 'ALL';
    return this.notificationService.getNotificationHistory(targetUserId, query);
  }
}
