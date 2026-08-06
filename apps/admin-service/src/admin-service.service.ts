import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'libs/prisma';
import { State as CountryState } from 'country-state-city';
import {
  CreateStateDto,
  CreateZoneDto,
  CreateLandmarkDto,
  CreatePricingMatrixDto,
} from './dto/admin.dto';
import { PaginationQueryDto, buildPaginatedResponse } from 'libs/common';
import { UserRole, OrderStatus } from 'libs/constants';

@Injectable()
export class AdminServiceService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  async getNigeriaStates() {
    const states = CountryState.getStatesOfCountry('NG');
    return states.map((s) => ({
      name: s.name.replace(/ State$/i, '').trim(),
      code: s.isoCode,
      fullName: s.name,
      countryCode: s.countryCode,
      latitude: s.latitude,
      longitude: s.longitude,
    }));
  }

  async seedNigeriaStates() {
    const states = await this.getNigeriaStates();
    const created: any[] = [];

    for (const stateData of states) {
      const state = await this.prisma.state.upsert({
        where: { code: stateData.code },
        update: {
          name: stateData.name,
          status: 'ACTIVE',
        },
        create: {
          name: stateData.name,
          code: stateData.code,
          status: 'ACTIVE',
        },
      });
      created.push(state);
    }

    return {
      message: `Successfully seeded ${created.length} Nigerian states`,
      count: created.length,
      states: created,
    };
  }
  async createState(dto: CreateStateDto) {
    return this.prisma.state.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        status: dto.status || 'ACTIVE',
      },
    });
  }

  async updateState(id: string, dto: Partial<CreateStateDto>) {
    const existing = await this.prisma.state.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`State ${id} not found`);
    }
    return this.prisma.state.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code ? dto.code.toUpperCase() : undefined,
        status: dto.status,
      },
    });
  }

  async listStates(query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 40;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = query.status.toUpperCase();
    }

    const orderBy: any = { name: 'asc' };

    const [states, total] = await Promise.all([
      this.prisma.state.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { zones: { select: { id: true, name: true, basePrice: true, status: true } } },
      }),
      this.prisma.state.count({ where }),
    ]);

    return buildPaginatedResponse(states, total, page, limit);
  }

  // ==========================================
  // ZONE MANAGEMENT
  // ==========================================
  async createZone(dto: CreateZoneDto) {
    if (dto.stateId) {
      const state = await this.prisma.state.findUnique({ where: { id: dto.stateId } });
      if (!state) {
        throw new NotFoundException(`State ${dto.stateId} not found`);
      }
    }
    return this.prisma.zone.create({
      data: {
        name: dto.name,
        stateId: dto.stateId || null,
        basePrice: dto.basePrice,
        status: dto.status || 'ACTIVE',
      },
      include: { state: true },
    });
  }

  async updateZone(id: string, dto: Partial<CreateZoneDto>) {
    const existing = await this.prisma.zone.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Zone ${id} not found`);
    }
    if (dto.stateId) {
      const state = await this.prisma.state.findUnique({ where: { id: dto.stateId } });
      if (!state) {
        throw new NotFoundException(`State ${dto.stateId} not found`);
      }
    }
    return this.prisma.zone.update({
      where: { id },
      data: {
        name: dto.name,
        stateId: dto.stateId,
        basePrice: dto.basePrice,
        status: dto.status,
      },
      include: { state: true },
    });
  }

  async listZones(query: PaginationQueryDto & { stateId?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.status) {
      where.status = query.status.toUpperCase();
    }
    if (query.stateId) {
      where.stateId = query.stateId;
    }

    const orderBy: any = {};
    const sortField = query.sort || 'name';
    orderBy[sortField] = query.order || 'asc';

    const [zones, total] = await Promise.all([
      this.prisma.zone.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { state: { select: { id: true, name: true, code: true } }, landmarks: true },
      }),
      this.prisma.zone.count({ where }),
    ]);

    return buildPaginatedResponse(zones, total, page, limit);
  }

  // ==========================================
  // LANDMARK MANAGEMENT
  // ==========================================
  async createLandmark(dto: CreateLandmarkDto) {
    const zone = await this.prisma.zone.findUnique({
      where: { id: dto.zoneId },
    });
    if (!zone) {
      throw new NotFoundException(`Zone ${dto.zoneId} not found`);
    }

    return this.prisma.landmark.create({
      data: {
        name: dto.name,
        zoneId: dto.zoneId,
      },
    });
  }

  async listLandmarks(query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query.zoneId) {
      where.zoneId = query.zoneId;
    }

    const orderBy: any = {};
    const sortField = query.sort || 'createdAt';
    orderBy[sortField] = query.order || 'desc';

    const [landmarks, total] = await Promise.all([
      this.prisma.landmark.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { zone: true },
      }),
      this.prisma.landmark.count({ where }),
    ]);

    return buildPaginatedResponse(landmarks, total, page, limit);
  }

  // ==========================================
  // PRICING MATRIX MANAGEMENT
  // ==========================================
  async createPricingMatrix(dto: CreatePricingMatrixDto) {
    // Prevent duplicate route pair
    const existing = await this.prisma.pricingMatrix.findFirst({
      where: { fromZoneId: dto.fromZoneId, toZoneId: dto.toZoneId },
    });
    if (existing) {
      throw new BadRequestException(
        `A pricing rule for this zone-to-zone route already exists (id: ${existing.id}). Use PUT /admin/pricing/${existing.id} to update it.`,
      );
    }

    const created = await this.prisma.pricingMatrix.create({
      data: {
        fromZoneId: dto.fromZoneId,
        toZoneId: dto.toZoneId,
        price: dto.price,
        status: dto.status || 'ACTIVE',
      },
    });
    return this.enrichPricingMatrix(created);
  }

  async getPricingMatrix(id: string) {
    const matrix = await this.prisma.pricingMatrix.findUnique({ where: { id } });
    if (!matrix) {
      throw new NotFoundException(`Pricing matrix ${id} not found`);
    }
    return this.enrichPricingMatrix(matrix);
  }

  async updatePricingMatrix(id: string, dto: Partial<CreatePricingMatrixDto>) {
    const existing = await this.prisma.pricingMatrix.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Pricing matrix ${id} not found`);
    }

    const updated = await this.prisma.pricingMatrix.update({
      where: { id },
      data: {
        ...(dto.fromZoneId && { fromZoneId: dto.fromZoneId }),
        ...(dto.toZoneId && { toZoneId: dto.toZoneId }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.status && { status: dto.status }),
      },
    });
    return this.enrichPricingMatrix(updated);
  }

  async deletePricingMatrix(id: string) {
    const existing = await this.prisma.pricingMatrix.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Pricing matrix ${id} not found`);
    }
    await this.prisma.pricingMatrix.delete({ where: { id } });
    return { success: true, message: `Pricing matrix ${id} deleted successfully` };
  }

  /** Fetches zone names and formats price for a single PricingMatrix row */
  private async enrichPricingMatrix(matrix: any) {
    const [fromZone, toZone] = await Promise.all([
      this.prisma.zone.findUnique({ where: { id: matrix.fromZoneId }, select: { id: true, name: true, status: true } }),
      this.prisma.zone.findUnique({ where: { id: matrix.toZoneId }, select: { id: true, name: true, status: true } }),
    ]);
    return {
      id: matrix.id,
      price: Number(matrix.price),
      status: matrix.status,
      createdAt: matrix.createdAt,
      updatedAt: matrix.updatedAt,
      fromZone: fromZone ?? { id: matrix.fromZoneId, name: 'Unknown', status: 'UNKNOWN' },
      toZone: toZone ?? { id: matrix.toZoneId, name: 'Unknown', status: 'UNKNOWN' },
    };
  }

  async listPricingMatrices(query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status.toUpperCase();
    }
    if (query.zoneId) {
      // Find matrices involving this zone either as origin or destination
      where.OR = [
        { fromZoneId: query.zoneId },
        { toZoneId: query.zoneId },
      ];
    }

    const orderBy: any = {};
    const sortField = query.sort || 'createdAt';
    orderBy[sortField] = query.order || 'desc';

    const [matrices, total] = await Promise.all([
      this.prisma.pricingMatrix.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.pricingMatrix.count({ where }),
    ]);

    const zoneIds = [...new Set(matrices.flatMap((m) => [m.fromZoneId, m.toZoneId]))];
    const zones = await this.prisma.zone.findMany({
      where: { id: { in: zoneIds } },
      select: { id: true, name: true, status: true },
    });
    const zoneMap = Object.fromEntries(zones.map((z) => [z.id, z]));

    const formattedMatrices = matrices.map((m) => ({
      id: m.id,
      price: Number(m.price),
      status: m.status,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      fromZone: zoneMap[m.fromZoneId] ?? { id: m.fromZoneId, name: 'Unknown', status: 'UNKNOWN' },
      toZone: zoneMap[m.toZoneId] ?? { id: m.toZoneId, name: 'Unknown', status: 'UNKNOWN' },
    }));

    return buildPaginatedResponse(formattedMatrices, total, page, limit);
  }

  // ==========================================
  // PRICING CALCULATION LOGIC (USED BY ORDER SERVICE)
  // ==========================================
  async calculateDeliveryPrice(fromLandmarkId: string, toLandmarkId: string) {
    const pickupLandmark = await this.prisma.landmark.findUnique({
      where: { id: fromLandmarkId },
      include: { zone: true },
    });
    if (!pickupLandmark) {
      throw new NotFoundException(`Pickup landmark ${fromLandmarkId} not found`);
    }

    const destinationLandmark = await this.prisma.landmark.findUnique({
      where: { id: toLandmarkId },
      include: { zone: true },
    });
    if (!destinationLandmark) {
      throw new NotFoundException(`Destination landmark ${toLandmarkId} not found`);
    }

    const pickupZoneId = pickupLandmark.zoneId;
    const destinationZoneId = destinationLandmark.zoneId;

    // 1. Same-zone delivery
    if (pickupZoneId === destinationZoneId) {
      const zone = pickupLandmark.zone;
      if (!zone) {
        throw new NotFoundException(`Pickup zone not found`);
      }
      const price = Number(zone.basePrice);
      return {
        fromLandmarkId,
        toLandmarkId,
        fromZoneId: pickupZoneId,
        toZoneId: destinationZoneId,
        price,
        amount: price,
      };
    }

    // 2. Zone-to-Zone delivery lookup
    const matrix = await this.prisma.pricingMatrix.findFirst({
      where: {
        fromZoneId: pickupZoneId,
        toZoneId: destinationZoneId,
        status: 'ACTIVE',
      },
    });

    if (!matrix) {
      throw new BadRequestException(`Delivery route between these zones has not been configured`);
    }

    const price = Number(matrix.price);
    return {
      fromLandmarkId,
      toLandmarkId,
      fromZoneId: pickupZoneId,
      toZoneId: destinationZoneId,
      price,
      amount: price,
    };
  }

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================
  async getDashboardStats() {
    const activeOrderStatuses = [
      OrderStatus.PENDING,
      OrderStatus.ASSIGNED,
      OrderStatus.PICKED_UP,
    ];

    const [
      zonesCount,
      landmarksCount,
      totalCustomers,
      totalRiders,
      activeDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      revenueAggregate,
    ] = await Promise.all([
      // Admin schema
      this.prisma.zone.count(),
      this.prisma.landmark.count(),

      // User schema — customers only (exclude ADMIN / SUPER_ADMIN / RIDER)
      this.prisma.user.count({
        where: { role: UserRole.CUSTOMER },
      }),

      // User schema — riders only
      this.prisma.user.count({
        where: { role: UserRole.RIDER },
      }),

      // Order schema — in-flight orders
      this.prisma.order.count({
        where: { status: { in: activeOrderStatuses } },
      }),

      // Order schema — successfully delivered
      this.prisma.order.count({
        where: { status: OrderStatus.DELIVERED },
      }),

      // Order schema — cancelled
      this.prisma.order.count({
        where: { status: OrderStatus.CANCELLED },
      }),

      // Revenue: sum of amounts for all DELIVERED (paid) orders
      this.prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: OrderStatus.DELIVERED },
      }),
    ]);

    const totalRevenueUnits = revenueAggregate._sum.amount
      ? Number(revenueAggregate._sum.amount)
      : 0;

    return {
      activeZones: zonesCount,
      activeLandmarks: landmarksCount,
      totalRegisteredUsers: totalCustomers,
      totalRegisteredRiders: totalRiders,
      activeDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      totalRevenueUnits,
    };
  }

  // ==========================================
  // REVENUE — LAST 14 DAYS (DAILY CHART DATA)
  // ==========================================
  async getRevenueChart() {
    const now = new Date();
    const since = new Date(now);
    since.setDate(since.getDate() - 13); // inclusive: today − 13 = 14 days
    since.setHours(0, 0, 0, 0);

    // Pull all delivered orders in the window
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        createdAt: { gte: since },
      },
      select: { amount: true, createdAt: true },
    });

    // Build a map keyed by YYYY-MM-DD
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, 0);
    }

    for (const order of orders) {
      const key = order.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, dailyMap.get(key)! + Number(order.amount));
      }
    }

    const days = Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));

    const totalRevenue = days.reduce((sum, d) => sum + d.revenue, 0);
    const peakDay = days.reduce(
      (max, d) => (d.revenue > max.revenue ? d : max),
      days[0],
    );

    return {
      period: { from: since.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) },
      totalRevenue,
      peakDay,
      days,
    };
  }

  // ==========================================
  // RECENT ORDERS (LAST 10, SYSTEM-WIDE)
  // ==========================================
  async getRecentOrders(limit = 10) {
    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        customerId: true,
        riderId: true,
        pickupAddress: true,
        destinationAddress: true,
        amount: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Enrich with basic customer profile (same DB)
    const enriched = await Promise.all(
      orders.map(async (order) => {
        const customer = await this.prisma.user.findUnique({
          where: { id: order.customerId },
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, phoneNumber: true },
            },
          },
        });
        return {
          ...order,
          amount: Number(order.amount),
          customer: customer
            ? {
                id: customer.id,
                email: customer.email,
                firstName: customer.profile?.firstName ?? null,
                lastName: customer.profile?.lastName ?? null,
                phoneNumber: customer.profile?.phoneNumber ?? null,
              }
            : null,
        };
      }),
    );

    return { total: enriched.length, orders: enriched };
  }
}
