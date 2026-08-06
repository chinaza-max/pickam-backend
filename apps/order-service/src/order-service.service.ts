import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'libs/prisma';
import { HttpService } from '@nestjs/axios';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, UserRole } from 'libs/constants';
import { firstValueFrom } from 'rxjs';
import { PaginationQueryDto, buildPaginatedResponse } from 'libs/common';

@Injectable()
export class OrderServiceService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async createOrder(customerId: string, dto: CreateOrderDto) {
    // 1. Calculate price from Admin Service
    let price = 1500; // Fallback price in case of service downtime
    let pickupZoneId = 'zone-fallback-1';
    let destinationZoneId = 'zone-fallback-2';

    try {
      const adminServiceUrl =
        process.env.ADMIN_SERVICE_URL || 'http://localhost:3005';
      const pricingRes = await firstValueFrom(
        this.httpService.get(
          `${adminServiceUrl}/admin/pricing/calculate?fromLandmarkId=${dto.pickupLandmarkId}&toLandmarkId=${dto.destinationLandmarkId}`,
        ),
      );
      if (pricingRes.data && pricingRes.data.success) {
        price = pricingRes.data.data.amount;
        pickupZoneId = pricingRes.data.data.fromZoneId;
        destinationZoneId = pricingRes.data.data.toZoneId;
      }
    } catch (err) {
      console.warn(
        `Failed to calculate price via Admin Service: ${err.message}. Using default MVP pricing: ${price}`,
      );
    }

    // 2. Validate wallet balance in Wallet Service
    let walletBalance = 0;
    try {
      const walletServiceUrl =
        process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
      const balanceRes = await firstValueFrom(
        this.httpService.get(
          `${walletServiceUrl}/wallets/users/${customerId}/balance`,
        ),
      );
      walletBalance = balanceRes.data.data.balance;
    } catch (err) {
      throw new BadRequestException(
        `Could not verify wallet balance: ${err.message}`,
      );
    }

    if (walletBalance < price) {
      throw new BadRequestException(
        `Insufficient units. Required: ${price}, Wallet Balance: ${walletBalance}`,
      );
    }

    // 3. Create the order record and deduct wallet balance
    const orderId = `ord_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const walletServiceUrl =
        process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
      await firstValueFrom(
        this.httpService.post(`${walletServiceUrl}/wallets/deduct`, {
          userId: customerId,
          amount: price,
          reference: orderId,
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to deduct units from wallet: ${err.message}`,
      );
    }

    // 4. Save order to DB
    const expiresAt = dto.expiresInMinutes
      ? new Date(Date.now() + dto.expiresInMinutes * 60 * 1000)
      : new Date(Date.now() + 60 * 60 * 1000); // default 60 min expiry

    const order = await this.prisma.order.create({
      data: {
        id: orderId,
        customerId,
        pickupAddress: dto.pickupAddress,
        destinationAddress: dto.destinationAddress,
        pickupZoneId,
        destinationZoneId,
        amount: price,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
        recipientName: dto.recipientName || null,
        recipientPhone: dto.recipientPhone || null,
        pickupNotes: dto.pickupNotes || null,
        deliveryNotes: dto.deliveryNotes || null,
        expiresAt,
      },
    });

    // 5. Log Order Event
    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        status: OrderStatus.PENDING,
        description: 'Order placed successfully. Searching for nearby riders.',
      },
    });

    // 6. Trigger Push Notification to Customer
    this.sendNotification(
      customerId,
      'Order Placed',
      `Your delivery order ${orderId} has been successfully created. We are assigning a rider.`,
    );

    return order;
  }

  async assignRider(orderId: string, riderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Rider can only be assigned to pending orders');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        riderId,
        status: OrderStatus.ASSIGNED,
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        status: OrderStatus.ASSIGNED,
        description: `Rider ${riderId} assigned to your order.`,
      },
    });

    // Notify Customer and Rider
    this.sendNotification(
      order.customerId,
      'Rider Assigned',
      `Rider has accepted your delivery order ${orderId}.`,
    );
    this.sendNotification(
      riderId,
      'New Delivery Assigned',
      `You have been assigned to order ${orderId}. Please proceed to pickup location.`,
    );

    return updated;
  }

  // ==========================================
  // RIDER SELF-ACCEPT ORDER
  // ==========================================
  async acceptOrder(orderId: string, riderId: string) {
    // Use a transaction to prevent race conditions (two riders accepting the same order)
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          'This order is no longer available. It may have been accepted by another rider.',
        );
      }

      // Check if the order has expired
      if (order.expiresAt && new Date() > order.expiresAt) {
        throw new BadRequestException('This order has expired and is no longer available.');
      }

      // Assign rider and update status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          riderId,
          status: OrderStatus.ASSIGNED,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          status: OrderStatus.ASSIGNED,
          description: `Rider ${riderId} accepted this order.`,
        },
      });

      // Notify Customer
      this.sendNotification(
        order.customerId,
        'Rider Accepted',
        `A rider has accepted your delivery order ${orderId} and is heading to the pickup location.`,
      );

      // Notify Rider
      this.sendNotification(
        riderId,
        'Order Accepted',
        `You have accepted order ${orderId}. Navigate to the pickup location.`,
      );

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }

  // ==========================================
  // LIST AVAILABLE ORDERS FOR RIDERS
  // ==========================================
  async getAvailableOrders(riderId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      status: OrderStatus.PENDING,
      riderId: null,
    };

    // Only show non-expired orders
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    // Filter available jobs by the rider's operating zones
    const riderZones = await this.prisma.riderZone.findMany({
      where: { riderId },
    });
    const riderZoneIds = riderZones.map((rz) => rz.zoneId);

    if (query.zoneId) {
      where.pickupZoneId = query.zoneId;
    } else if (riderZoneIds.length > 0) {
      where.pickupZoneId = { in: riderZoneIds };
    }

    if (query.search) {
      where.AND = [
        {
          OR: [
            { pickupAddress: { contains: query.search, mode: 'insensitive' } },
            { destinationAddress: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const orderBy: any = {};
    orderBy[query.sort || 'createdAt'] = query.order || 'desc';

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          pickupAddress: true,
          destinationAddress: true,
          pickupZoneId: true,
          destinationZoneId: true,
          amount: true,
          recipientName: true,
          pickupNotes: true,
          deliveryNotes: true,
          expiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map((o) => ({
      ...o,
      amount: Number(o.amount),
    }));

    return buildPaginatedResponse(formattedOrders, total, page, limit);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate permission
    if (role === UserRole.RIDER && order.riderId !== userId) {
      throw new BadRequestException('You are not assigned to this order');
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update order in ${order.status} status`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    let description = `Order status updated to: ${status}`;
    if (status === OrderStatus.PICKED_UP) {
      description = 'Rider has picked up your package and is on the way.';
    } else if (status === OrderStatus.DELIVERED) {
      description = 'Your package has been successfully delivered.';
    }

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        status,
        description,
      },
    });

    // Notify Customer
    this.sendNotification(order.customerId, 'Order Update', description);

    return updated;
  }

  async cancelOrder(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new BadRequestException('You do not own this order');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.ASSIGNED) {
      throw new BadRequestException(
        `Cannot cancel order at this stage: current status is ${order.status}`,
      );
    }

    // Cancel order and issue refund
    const updated = await this.prisma.$transaction(async (tx) => {
      const orderRef = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          description: 'Order was cancelled and payment has been refunded.',
        },
      });

      return orderRef;
    });

    // Invoke Wallet Service refund endpoint
    try {
      const walletServiceUrl =
        process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
      await firstValueFrom(
        this.httpService.post(`${walletServiceUrl}/wallets/refund`, {
          userId: order.customerId,
          amount: Number(order.amount),
          reference: `refund_${orderId}`,
        }),
      );
    } catch (err) {
      console.error(`Refund processing failed for order ${orderId}:`, err.message);
      // In production, we'd trigger a queue event or alarm
    }

    // Notify Customer
    this.sendNotification(
      order.customerId,
      'Order Cancelled',
      `Your delivery order ${orderId} was cancelled. Wallet units refunded.`,
    );

    if (order.riderId) {
      this.sendNotification(
        order.riderId,
        'Delivery Cancelled',
        `Assigned order ${orderId} has been cancelled by the customer.`,
      );
    }

    return updated;
  }

  async getOrderHistory(userId: string, role: string, query: PaginationQueryDto & { userId?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (role === UserRole.RIDER) {
      where.riderId = userId;
    } else if (role === UserRole.CUSTOMER) {
      where.customerId = userId;
    } else if (role === UserRole.ADMIN) {
      if (query.userId) {
        where.customerId = query.userId;
      }
    }

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { recipientName: { contains: query.search, mode: 'insensitive' } },
        { recipientPhone: { contains: query.search, mode: 'insensitive' } },
        { pickupAddress: { contains: query.search, mode: 'insensitive' } },
        { destinationAddress: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status.toUpperCase();
    }
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus.toUpperCase();
    }
    if (query.zoneId) {
      where.OR = [
        { pickupZoneId: query.zoneId },
        { destinationZoneId: query.zoneId },
      ];
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const orderBy: any = {};
    const sortField = query.sort || 'createdAt';
    orderBy[sortField] = query.order || 'desc';

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map((o) => ({
      ...o,
      amount: Number(o.amount),
    }));

    return buildPaginatedResponse(formattedOrders, total, page, limit);
  }

  async getOrderDetails(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const events = await this.prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      ...order,
      amount: Number(order.amount),
      events,
    };
  }

  // Trigger Notification Service
  private async sendNotification(userId: string, title: string, message: string) {
    try {
      const notificationServiceUrl =
        process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
      await firstValueFrom(
        this.httpService.post(`${notificationServiceUrl}/notifications`, {
          userId,
          title,
          message,
          type: 'PUSH',
        }),
      );
    } catch (err) {
      console.warn(`Failed to dispatch notification: ${err.message}`);
    }
  }
}
