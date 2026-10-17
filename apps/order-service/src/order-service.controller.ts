import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderServiceService } from './order-service.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, AssignRiderDto } from './dto/update-order.dto';
import { AuthGuard, RolesGuard } from 'libs/guards';
import { CurrentUser, Roles } from 'libs/decorators';
import { UserRole } from 'libs/constants';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from 'libs/common';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class OrderServiceController {
  constructor(private readonly orderService: OrderServiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new delivery order' })
  async createOrder(
    @CurrentUser('id') customerId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(customerId, dto);
  }

  @Post(':id/assign-rider')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a rider to a pending order (Admin only)' })
  async assignRider(@Param('id') orderId: string, @Body() dto: AssignRiderDto) {
    return this.orderService.assignRider(orderId, dto.riderId);
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Rider accepts a pending or assigned order (Riders only)' })
  async acceptOrder(
    @Param('id') orderId: string,
    @CurrentUser('id') riderId: string,
  ) {
    return this.orderService.acceptOrder(orderId, riderId);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Rider rejects/declines an assigned order (Riders only)' })
  async rejectOrder(
    @Param('id') orderId: string,
    @CurrentUser('id') riderId: string,
  ) {
    return this.orderService.rejectOrder(orderId, riderId);
  }

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'List available pending orders for riders to accept' })
  async getAvailableOrders(
    @CurrentUser('id') riderId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.orderService.getAvailableOrders(riderId, query);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update order status (Riders or Admins only)' })
  async updateStatus(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(orderId, dto.status, userId, role);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order and trigger refund' })
  async cancelOrder(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.orderService.cancelOrder(orderId, userId, role);
  }

  @Post(':id/confirm-receipt')
  @ApiOperation({ summary: 'Customer confirms package receipt, releasing payment to courier' })
  async confirmReceipt(
    @Param('id') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.orderService.confirmReceipt(orderId, userId, role);
  }

  @Get('history')
  @ApiOperation({ summary: 'Retrieve order history for current user' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query() query: PaginationQueryDto & { userId?: string },
  ) {
    return this.orderService.getOrderHistory(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and events log of a specific order' })
  async getOrderDetails(@Param('id') orderId: string) {
    return this.orderService.getOrderDetails(orderId);
  }
}
