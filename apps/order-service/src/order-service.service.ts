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
        pickupLandmarkId: dto.pickupLandmarkId || null,
        destinationLandmarkId: dto.destinationLandmarkId || null,
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

    // 7. Notify online riders about the new available delivery
    try {
      const onlineRiders = await this.prisma.riderProfile.findMany({
        where: { status: 'ONLINE' },
        select: { userId: true },
      });
      for (const rider of onlineRiders) {
        this.sendNotification(
          rider.userId,
          'New Delivery Available 🛵',
          `Order #${orderId} is available for pickup at ${dto.pickupAddress} (₦${Number(price).toLocaleString()}). Tap to accept.`,
          'ORDER_AVAILABLE',
          {
            orderId,
            pickupAddress: dto.pickupAddress,
            destinationAddress: dto.destinationAddress,
            amount: String(price),
          },
        );
      }
    } catch (err: any) {
      console.warn('Failed to notify online riders:', err.message);
    }

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

    const riderInfo = await this.getRiderVehicleInfo(riderId);

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        status: OrderStatus.ASSIGNED,
        description: `Courier ${riderInfo.name} (${riderInfo.vehicleLabel}) assigned to your order.`,
      },
    });

    // Notify Customer and Rider with rich details
    this.sendNotification(
      order.customerId,
      `${riderInfo.icon} Courier Assigned — ${riderInfo.name}`,
      `${riderInfo.name} (${riderInfo.vehicleLabel}) has been assigned to delivery #${orderId} and is on the way to pickup.`,
      'ORDER_ASSIGNED',
      {
        orderId,
        status: 'ASSIGNED',
        riderId,
        riderName: riderInfo.name,
        vehicleType: riderInfo.vehicleType,
        vehiclePlate: riderInfo.vehiclePlate || '',
      },
    );
    this.sendNotification(
      riderId,
      'New Delivery Assigned 🛵',
      `You have been assigned to order #${orderId}. Please proceed to pickup location.`,
      'ORDER_ASSIGNED',
      {
        orderId,
        status: 'ASSIGNED',
      },
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

      const isPending = order.status === OrderStatus.PENDING;
      const isAssignedToThisRider = order.status === OrderStatus.ASSIGNED && order.riderId === riderId;

      if (!isPending && !isAssignedToThisRider) {
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

      const riderInfo = await this.getRiderVehicleInfo(riderId);

      await tx.orderEvent.create({
        data: {
          orderId,
          status: OrderStatus.ASSIGNED,
          description: `${riderInfo.name} (${riderInfo.vehicleLabel}) accepted this order.`,
        },
      });

      // Notify Customer
      this.sendNotification(
        order.customerId,
        `${riderInfo.icon} Rider Assigned — ${riderInfo.name}`,
        `${riderInfo.name} (${riderInfo.vehicleLabel}) accepted your delivery #${orderId} and is heading to the pickup location.`,
        'ORDER_ASSIGNED',
        {
          orderId,
          status: 'ASSIGNED',
          riderId,
          riderName: riderInfo.name,
          vehicleType: riderInfo.vehicleType,
          vehiclePlate: riderInfo.vehiclePlate || '',
        },
      );

      // Notify Rider
      this.sendNotification(
        riderId,
        'Order Accepted 👍',
        `You have accepted order #${orderId}. Navigate to the pickup location.`,
        'ORDER_ACCEPTED',
        {
          orderId,
          status: 'ASSIGNED',
        },
      );

      return {
        ...updated,
        amount: Number(updated.amount),
      };
    });
  }

  // ==========================================
  // RIDER REJECT ASSIGNED ORDER
  // ==========================================
  async rejectOrder(orderId: string, riderId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.riderId !== riderId) {
        throw new BadRequestException('You are not assigned to this order');
      }

      const rejectableStatuses = [OrderStatus.ASSIGNED, OrderStatus.PENDING, 'ARRIVED_PICKUP'];
      if (!rejectableStatuses.includes(order.status as any)) {
        throw new BadRequestException('Cannot reject an order that has already been picked up or completed');
      }

      // Unassign the rider and return to PENDING
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          riderId: null,
          status: OrderStatus.PENDING,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId,
          status: OrderStatus.PENDING,
          description: `Assigned rider declined delivery. Re-routing to available riders.`,
        },
      });

      // Notify Customer
      this.sendNotification(
        order.customerId,
        'Finding Another Rider',
        `Your delivery order ${orderId} is being re-routed to another rider.`,
      );

      return {
        ...updated,
        amount: Number(updated.amount),
        message: 'Order assignment rejected successfully. The order has been returned to the pool.',
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
      }),
      this.prisma.order.count({ where }),
    ]);

    const formattedOrders = await this.enrichOrdersWithUsers(orders);

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

    const riderInfo = await this.getRiderVehicleInfo(order.riderId || userId);
    let title = `${riderInfo.icon} Order Update`;
    let description = `Order status updated to: ${status}`;
    let notifType = 'ORDER_UPDATE';

    if (status === ('ARRIVED_PICKUP' as any)) {
      title = `${riderInfo.icon} Courier Arrived at Pickup`;
      description = `${riderInfo.name} has arrived at the pickup location with their ${riderInfo.vehicleLabel}.`;
      notifType = 'ORDER_ARRIVED_PICKUP';
    } else if (status === OrderStatus.PICKED_UP) {
      title = `📦💨 Package Picked Up!`;
      description = `${riderInfo.name} has picked up your package using their ${riderInfo.vehicleLabel} and is in transit to your destination!`;
      notifType = 'ORDER_PICKED_UP';
    } else if (status === ('ARRIVED_DESTINATION' as any)) {
      title = `🏁 Courier Arrived at Destination`;
      description = `${riderInfo.name} has arrived at the drop-off destination with your package (${riderInfo.vehicleLabel}).`;
      notifType = 'ORDER_ARRIVED_DESTINATION';
    } else if (status === OrderStatus.DELIVERED) {
      title = `🎉 Package Delivered!`;
      description = `Your package has been delivered by ${riderInfo.name} (${riderInfo.vehicleLabel}). Please inspect and confirm receipt in your app.`;
      notifType = 'ORDER_DELIVERED';
    }

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        status,
        description,
      },
    });

    // Notify Customer with rich vehicle info and push payload
    this.sendNotification(order.customerId, title, description, notifType, {
      orderId,
      status: String(status),
      riderId: String(order.riderId || userId || ''),
      riderName: riderInfo.name,
      vehicleType: riderInfo.vehicleType,
      vehiclePlate: riderInfo.vehiclePlate || '',
    });

    // Notify Rider of delivery status progression
    const activeRiderId = order.riderId || (role === UserRole.RIDER ? userId : null);
    if (activeRiderId) {
      let riderTitle = '';
      let riderMsg = '';
      if (status === ('ARRIVED_PICKUP' as any)) {
        riderTitle = 'Arrived at Pickup 📍';
        riderMsg = `You marked arrival at pickup for order #${orderId}. Collect package from sender.`;
      } else if (status === OrderStatus.PICKED_UP) {
        riderTitle = 'Package Picked Up 📦💨';
        riderMsg = `Order #${orderId} is in transit. Head safely to destination.`;
      } else if (status === ('ARRIVED_DESTINATION' as any)) {
        riderTitle = 'Arrived at Destination 🏁';
        riderMsg = `You arrived at the destination for order #${orderId}. Deliver package to recipient.`;
      } else if (status === OrderStatus.DELIVERED) {
        riderTitle = 'Delivery Completed 🎉';
        riderMsg = `Order #${orderId} marked as delivered! Customer will confirm receipt shortly.`;
      }

      if (riderTitle) {
        this.sendNotification(activeRiderId, riderTitle, riderMsg, notifType, {
          orderId,
          status: String(status),
        });
      }
    }

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

  async confirmReceipt(orderId: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (role === UserRole.CUSTOMER && order.customerId !== userId) {
      throw new BadRequestException('You do not own this order');
    }

    if (order.status === OrderStatus.PENDING || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot confirm receipt for order in ${order.status} state. A courier must be assigned and deliver your package first.`,
      );
    }

    if (order.fundsReleased && order.isReceived) {
      return {
        success: true,
        message: 'Order receipt already confirmed and funds released.',
        order,
      };
    }

    let riderPayoutAmount = 0;
    let payoutType = 'PERCENTAGE';
    let commissionRate = 80;

    if (order.riderId) {
      try {
        const riderProfile = await this.prisma.riderProfile.findUnique({
          where: { userId: order.riderId },
        });

        if (riderProfile) {
          payoutType = (riderProfile.payoutType || 'PERCENTAGE').toUpperCase();
          commissionRate = riderProfile.commissionRate ? Number(riderProfile.commissionRate) : 80;
        }

        if (payoutType === 'PERCENTAGE') {
          riderPayoutAmount = Math.round((Number(order.amount) * commissionRate) / 100);

          // Credit rider wallet via Wallet Service
          const walletServiceUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
          await firstValueFrom(
            this.httpService.post(`${walletServiceUrl}/wallets/credit`, {
              userId: order.riderId,
              amount: riderPayoutAmount,
              reference: `earnings_${order.id}`,
              description: `Earnings (${commissionRate}% payout) for delivery #${order.id}`,
            }),
          );

          this.sendNotification(
            order.riderId,
            'Earnings Released! 💰',
            `Customer confirmed receipt for order ${order.id}! ₦${riderPayoutAmount} (${commissionRate}%) has been added to your wallet.`,
          );
        } else {
          // MONTHLY SALARY plan: Deliveries are tracked without per-order wallet credit
          riderPayoutAmount = 0;
          this.sendNotification(
            order.riderId,
            'Delivery Confirmed! ✓',
            `Customer confirmed receipt for order ${order.id}. Recorded toward your monthly delivery performance.`,
          );
        }
      } catch (err) {
        console.error(`Failed to process rider payout for order ${orderId}:`, err.message);
      }
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DELIVERED,
        isReceived: true,
        receivedAt: new Date(),
        fundsReleased: true,
        riderPayout: riderPayoutAmount,
      },
    });

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        status: OrderStatus.DELIVERED,
        description:
          payoutType === 'MONTHLY'
            ? 'Customer confirmed package received. Recorded under courier monthly salary plan.'
            : `Customer confirmed package received. ₦${riderPayoutAmount} released to courier wallet.`,
      },
    });

    this.sendNotification(
      order.customerId,
      'Delivery Completed',
      `You confirmed receipt of order ${order.id}. Thank you for using PickAm!`,
    );

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

    const formattedOrders = await this.enrichOrdersWithUsers(orders);

    return buildPaginatedResponse(formattedOrders, total, page, limit);
  }

  async getOrderDetails(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const [enrichedOrder] = await this.enrichOrdersWithUsers([order]);

    const events = await this.prisma.orderEvent.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    let emergencyDropOffPartners: any[] = [];
    let destinationLandmark: any = null;
    let pickupLandmark: any = null;

    if (order.destinationLandmarkId) {
      try {
        destinationLandmark = await this.prisma.landmark.findUnique({
          where: { id: order.destinationLandmarkId },
        });
        emergencyDropOffPartners = await this.prisma.dropOffPartner.findMany({
          where: {
            landmarkId: order.destinationLandmarkId,
            status: 'ACTIVE',
          },
          orderBy: { name: 'asc' },
        });
      } catch (e) {
        console.warn('Could not fetch destination landmark dropoff partners', e);
      }
    }

    if (order.pickupLandmarkId) {
      try {
        pickupLandmark = await this.prisma.landmark.findUnique({
          where: { id: order.pickupLandmarkId },
        });
      } catch (e) {
        // ignore
      }
    }

    return {
      ...enrichedOrder,
      pickupLandmark,
      destinationLandmark,
      emergencyDropOffPartners,
      events,
    };
  }

  /**
   * Helper method to batch-enrich orders with customer and rider profile details from user_schema
   */
  private async enrichOrdersWithUsers(orders: any[]) {
    if (!orders || orders.length === 0) return [];

    const customerIds = Array.from(new Set(orders.map((o) => o.customerId).filter(Boolean)));
    const riderIds = Array.from(new Set(orders.map((o) => o.riderId).filter(Boolean)));
    const userIds = Array.from(new Set([...customerIds, ...riderIds]));

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        role: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            avatarUrl: true,
          },
        },
      },
    });

    const userMap = new Map(
      users.map((u) => [
        u.id,
        {
          id: u.id,
          email: u.email,
          role: u.role,
          firstName: u.profile?.firstName ?? null,
          lastName: u.profile?.lastName ?? null,
          phoneNumber: u.profile?.phoneNumber ?? null,
          avatarUrl: u.profile?.avatarUrl ?? null,
        },
      ]),
    );

    const riderProfiles = riderIds.length > 0
      ? await this.prisma.riderProfile.findMany({
          where: { userId: { in: riderIds } },
        })
      : [];

    const riderProfileMap = new Map(
      riderProfiles.map((rp) => [rp.userId, rp]),
    );

    return orders.map((o) => {
      const riderObj = o.riderId ? userMap.get(o.riderId) || null : null;
      const customerObj = o.customerId ? userMap.get(o.customerId) || null : null;
      const riderName = riderObj
        ? [riderObj.firstName, riderObj.lastName].filter(Boolean).join(" ") || riderObj.email
        : null;
      const customerName = customerObj
        ? [customerObj.firstName, customerObj.lastName].filter(Boolean).join(" ") || customerObj.email
        : null;

      const rp = o.riderId ? riderProfileMap.get(o.riderId) : null;
      const vehicleType = rp?.vehicleType || 'BIKE';
      const vehiclePlate = rp?.vehiclePlate || null;

      const enrichedRider = riderObj
        ? {
            ...riderObj,
            vehicleType,
            vehiclePlate,
            bike: `${vehicleType} (${vehiclePlate || 'Verified'})`,
          }
        : null;

      return {
        ...o,
        amount: Number(o.amount),
        vehicleType,
        vehiclePlate,
        customer: customerObj,
        rider: enrichedRider,
        riderName: o.riderName || riderName,
        riderPhone: o.riderPhone || riderObj?.phoneNumber || null,
        customerName: o.customerName || customerName,
        customerPhone: o.customerPhone || customerObj?.phoneNumber || null,
      };
    });
  }


  /**
   * Helper to fetch rich rider and vehicle metadata (type, plate, label, icon)
   */
  private async getRiderVehicleInfo(riderId?: string | null) {
    if (!riderId) {
      return {
        name: 'Your courier',
        vehicleType: 'BIKE',
        vehiclePlate: null,
        vehicleLabel: 'Motorcycle / Bike',
        icon: '🏍️',
      };
    }
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: riderId },
        include: { profile: true },
      });
      const riderProfile = await this.prisma.riderProfile.findUnique({
        where: { userId: riderId },
      });

      const name = user?.profile?.firstName
        ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
        : 'Your courier';
      const vehicleType = (riderProfile?.vehicleType || 'BIKE').toUpperCase();
      const vehiclePlate = riderProfile?.vehiclePlate || null;

      let vehicleLabel = 'Motorcycle / Bike';
      let icon = '🏍️';
      if (vehicleType === 'VAN') {
        vehicleLabel = 'Delivery Van';
        icon = '🚐';
      } else if (vehicleType === 'CAR') {
        vehicleLabel = 'Express Car';
        icon = '🚗';
      } else if (vehicleType === 'TRUCK') {
        vehicleLabel = 'Haulage Truck';
        icon = '🚛';
      }

      const plateText = vehiclePlate ? ` (Plate: ${vehiclePlate})` : '';

      return {
        name,
        vehicleType,
        vehiclePlate,
        vehicleLabel: `${vehicleLabel}${plateText}`,
        icon,
      };
    } catch {
      return {
        name: 'Your courier',
        vehicleType: 'BIKE',
        vehiclePlate: null,
        vehicleLabel: 'Motorcycle / Bike',
        icon: '🏍️',
      };
    }
  }

  // Trigger Notification Service
  private async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: string = 'ORDER_UPDATE',
    data?: Record<string, string>,
  ) {
    try {
      const notificationServiceUrl =
        process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
      await firstValueFrom(
        this.httpService.post(`${notificationServiceUrl}/notifications`, {
          userId,
          title,
          message,
          type,
          data: data || {},
        }),
      );
    } catch (err: any) {
      console.warn(`Failed to dispatch notification: ${err.message}`);
    }
  }
}
