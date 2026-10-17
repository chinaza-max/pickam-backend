import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'libs/prisma';
import { AuthService } from 'libs/auth';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRiderProfileDto } from './dto/rider-profile.dto';
import { UserRole, RiderStatus } from 'libs/constants';
import { firstValueFrom } from 'rxjs';
import { SocialLoginDto, LinkSocialDto, AddPasswordDto, ChangePasswordDto, AdminUpdateUserDto } from 'libs/dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto, buildPaginatedResponse } from 'libs/common';
import { EmailService } from './email.service';
import { SendOtpDto, VerifyOtpDto, ResetPasswordDto } from './dto/otp.dto';

@Injectable()
export class UserServiceService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private jwtService: JwtService,
    private httpService: HttpService,
    private emailService: EmailService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  async seedDefaultAdmin() {
    try {
      const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@pickam.com';
      const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'AdminPass789!';
      const firstName = process.env.DEFAULT_ADMIN_FIRSTNAME || 'Super';
      const lastName = process.env.DEFAULT_ADMIN_LASTNAME || 'Admin';

      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (!existingAdmin) {
        const hashedPassword = await this.auth.hashPassword(adminPassword);
        await this.prisma.user.create({
          data: {
            email: adminEmail,
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            status: 'ACTIVE',
            isVerified: true,
            profile: {
              create: {
                firstName,
                lastName,
                phoneNumber: '+2348000000000',
              },
            },
          },
        });
        console.log(`[UserService] Default Super Admin account seeded successfully: ${adminEmail}`);
      }
    } catch (error) {
      console.error('[UserService] Error seeding default admin:', error.message);
    }
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const hashedPassword = await this.auth.hashPassword(dto.password);

    // Write to user_schema using transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          role: dto.role,
          profile: {
            create: {
              firstName: dto.firstName,
              lastName: dto.lastName,
              phoneNumber: dto.phoneNumber,
            },
          },
        },
        include: {
          profile: true,
        },
      });

      if (dto.role === UserRole.RIDER) {
        await tx.riderProfile.create({
          data: {
            userId: newUser.id,
            vehicleType: dto.vehicleType || 'BIKE',
            vehiclePlate: dto.vehiclePlate || 'N/A',
            licenseNo: dto.licenseNo || 'N/A',
            status: RiderStatus.OFFLINE,
          },
        });
      }

      return newUser;
    });

    // Fire-and-forget or await Wallet Service creation
    try {
      const walletServiceUrl =
        process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
      await firstValueFrom(
        this.httpService.post(`${walletServiceUrl}/wallets`, {
          userId: user.id,
        }),
      );
    } catch (error) {
      console.error(
        `Failed to trigger wallet creation for user ${user.id}:`,
        error.message,
      );
      // In production, we would use an event queue (outbox pattern) to retry,
      // but for MVP, we log the failure and let the registration finish.
    }

    const token = await this.generateToken(user.id, user.email, user.role);

    // Auto-send email verification OTP (fire-and-forget so registration still completes)
    this.sendOtp({ email: user.email, purpose: 'EMAIL_VERIFICATION' }).catch((err) =>
      console.error(`[UserService] Failed to auto-send OTP for ${user.email}:`, err.message),
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        phoneNumber: user.profile?.phoneNumber,
      },
      token,
    };
  }

  async login(dto: LoginDto) {
    const cleanEmail = dto.email.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        deletedAt: null,
      },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('This account has been suspended. Please contact administration.');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'No password is set for this account. Please authenticate using your social provider or set a password first.',
      );
    }

    const isMatch = await this.auth.comparePassword(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    // Block unverified accounts — resend OTP and tell the client to verify
    if (!user.isVerified) {
      // Resend OTP automatically so they can verify immediately
      this.sendOtp({ email: user.email, purpose: 'EMAIL_VERIFICATION' }).catch((err) =>
        console.error(`[UserService] Failed to resend OTP for ${user.email}:`, err.message),
      );
      throw new ForbiddenException({
        message: 'Your email address is not verified. A new verification code has been sent to your email.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        firstName: user.profile?.firstName,
        lastName: user.profile?.lastName,
        phoneNumber: user.profile?.phoneNumber,
      },
      token,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const riderProfile =
      user.role === UserRole.RIDER
        ? await this.prisma.riderProfile.findUnique({ where: { userId } })
        : null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      status: user.status,
      profile: user.profile,
      riderProfile,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.profile.update({
      where: { userId },
      data: dto,
    });
    return updated;
  }

  async updateRiderProfile(userId: string, dto: UpdateRiderProfileDto) {
    const check = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!check) {
      throw new NotFoundException('Rider profile not found');
    }

    const updated = await this.prisma.riderProfile.update({
      where: { userId },
      data: dto,
    });

    return updated;
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.profile?.firstName,
      lastName: user.profile?.lastName,
      phoneNumber: user.profile?.phoneNumber,
    };
  }

  async findAllRiders(query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const rawStatus = (query.status || "").toLowerCase().trim();

    const riderProfileWhere: any = {};
    if (rawStatus === "online") {
      riderProfileWhere.status = "ONLINE";
    } else if (rawStatus === "offline") {
      riderProfileWhere.status = "OFFLINE";
    }

    const [riderProfiles, totalProfiles] = await Promise.all([
      this.prisma.riderProfile.findMany({
        where: riderProfileWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.riderProfile.count({ where: riderProfileWhere }),
    ]);

    const userIds = riderProfiles.map((rp) => rp.userId);

    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
        deletedAt: null,
      },
      include: {
        profile: true,
      },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let deliveryMap = new Map();
    try {
      const deliveryCounts = await this.prisma.order.groupBy({
        by: ["riderId"],
        where: {
          riderId: { in: userIds },
          status: "DELIVERED",
        },
        _count: { id: true },
      });
      deliveryMap = new Map(deliveryCounts.map((dc) => [dc.riderId, dc._count.id]));
    } catch {
      /* ignore */
    }

    const result: any[] = [];
    for (const rp of riderProfiles) {
      const user = userMap.get(rp.userId);
      if (!user) continue;

      const accountStatus = (user.status || "ACTIVE").toLowerCase() === "suspended" ? "suspended" : "active";

      if (rawStatus === "active" && accountStatus !== "active") {
        continue;
      }
      if (rawStatus === "suspended" && accountStatus !== "suspended") {
        continue;
      }

      const fullName = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") || user.email;
      const isOnline = String(rp.status || "").toUpperCase() === "ONLINE";
      const isVerified = Boolean(user.isVerified);
      const deliveries = deliveryMap.get(rp.userId) || 0;

      result.push({
        id: rp.userId,
        userId: rp.userId,
        name: fullName,
        firstName: user.profile?.firstName || "",
        lastName: user.profile?.lastName || "",
        email: user.email,
        phone: user.profile?.phoneNumber || "",
        phoneNumber: user.profile?.phoneNumber || "",
        vehicle: rp.vehicleType || "Motorcycle",
        vehicleType: rp.vehicleType || "Motorcycle",
        plateNumber: rp.vehiclePlate || "N/A",
        vehiclePlate: rp.vehiclePlate || "N/A",
        online: isOnline,
        status: accountStatus,
        availability: rp.status || "OFFLINE",
        verified: isVerified,
        isVerified: isVerified,
        accountStatus: user.status || "ACTIVE",
        rating: 5.0,
        deliveries,
        payoutType: (rp.payoutType || "PERCENTAGE").toUpperCase(),
        commissionRate: rp.commissionRate !== null && rp.commissionRate !== undefined ? Number(rp.commissionRate) : 80,
        monthlySalary: rp.monthlySalary !== null && rp.monthlySalary !== undefined ? Number(rp.monthlySalary) : null,
      });
    }

    return buildPaginatedResponse(result, totalProfiles, page, limit);
  }

  async updateRiderPayoutSettings(
    userId: string,
    dto: { payoutType: string; commissionRate?: number; monthlySalary?: number },
  ) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    const payoutType = (dto.payoutType || 'PERCENTAGE').toUpperCase();
    if (!['PERCENTAGE', 'MONTHLY'].includes(payoutType)) {
      throw new BadRequestException('Payout type must be PERCENTAGE or MONTHLY');
    }

    const updated = await this.prisma.riderProfile.update({
      where: { userId },
      data: {
        payoutType,
        ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
        ...(dto.monthlySalary !== undefined && { monthlySalary: dto.monthlySalary }),
      },
    });

    return {
      userId,
      payoutType: updated.payoutType,
      commissionRate: updated.commissionRate ? Number(updated.commissionRate) : 80,
      monthlySalary: updated.monthlySalary ? Number(updated.monthlySalary) : null,
      updatedAt: updated.updatedAt,
    };
  }

  async listUsers(query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        {
          profile: {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { phoneNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    if (query.role) {
      where.role = query.role.toUpperCase();
    }
    if (query.status) {
      where.status = query.status.toUpperCase();
    }
    if (query.verified) {
      where.isVerified = query.verified === 'true';
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

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          profile: true,
          socialAccounts: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      isVerified: u.isVerified,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      profile: u.profile,
      socialAccounts: u.socialAccounts.map((sa) => ({
        provider: sa.provider,
        createdAt: sa.createdAt,
      })),
    }));

    return buildPaginatedResponse(formattedUsers, total, page, limit);
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        profile: true,
        socialAccounts: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const riderProfile =
      user.role === UserRole.RIDER
        ? await this.prisma.riderProfile.findUnique({ where: { userId: id } })
        : null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile,
      socialAccounts: user.socialAccounts.map((sa) => ({
        provider: sa.provider,
        createdAt: sa.createdAt,
      })),
      riderProfile,
    };
  }

  async updateUser(id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userUpdateData: any = {};
    if (dto.role) userUpdateData.role = dto.role;
    if (dto.status) userUpdateData.status = dto.status;
    if (dto.isVerified !== undefined) userUpdateData.isVerified = dto.isVerified;

    const profileUpdateData: any = {};
    if (dto.firstName !== undefined) profileUpdateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) profileUpdateData.lastName = dto.lastName;
    if (dto.phoneNumber !== undefined) profileUpdateData.phoneNumber = dto.phoneNumber;
    if (dto.avatarUrl !== undefined) profileUpdateData.avatarUrl = dto.avatarUrl;

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: {
          ...userUpdateData,
          profile: {
            update: profileUpdateData,
          },
        },
        include: { profile: true },
      });
      return u;
    });

    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      isVerified: updated.isVerified,
      profile: updated.profile,
    };
  }

  async suspendUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    return { id: updated.id, status: updated.status };
  }

  async activateUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    return { id: updated.id, status: updated.status };
  }

  async softDeleteUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }

  async viewUserWallet(userId: string) {
    try {
      const walletServiceUrl =
        process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
      const balanceRes = await firstValueFrom(
        this.httpService.get(`${walletServiceUrl}/wallets/users/${userId}/balance`),
      );

      let transactions: any[] = [];
      try {
        const txRes = await firstValueFrom(
          this.httpService.get(`${walletServiceUrl}/wallets/transactions`, {
            params: { userId, limit: 50 },
          }),
        );
        transactions = Array.isArray(txRes.data?.data)
          ? txRes.data.data
          : Array.isArray(txRes.data?.data?.transactions)
          ? txRes.data.data.transactions
          : [];
      } catch (txErr) {
        // Continue without transactions if call fails
      }

      return {
        ...(balanceRes.data?.data || {}),
        transactions,
      };
    } catch (err) {
      throw new BadRequestException(`Could not retrieve user wallet: ${err.message}`);
    }
  }

  async viewUserOrders(userId: string, query: PaginationQueryDto) {
    try {
      const orderServiceUrl =
        process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
      const ordersRes = await firstValueFrom(
        this.httpService.get(`${orderServiceUrl}/orders/history`, {
          params: { ...query, userId },
          headers: {
            'x-user-id': userId,
            'x-user-role': 'ADMIN',
          },
        }),
      );
      return ordersRes.data;
    } catch (err) {
      throw new BadRequestException(`Could not retrieve user orders: ${err.message}`);
    }
  }

  async socialLogin(dto: SocialLoginDto) {
    const hashedProviderId = crypto
      .createHash('sha256')
      .update(dto.providerId)
      .digest('hex');

    // 1. Search for existing SocialAccount relation
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider: dto.provider,
          providerId: hashedProviderId,
        },
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    });

    let user = socialAccount?.user;

    if (user && user.deletedAt) {
      throw new UnauthorizedException('Invalid login credentials');
    }

    if (user && user.status === 'SUSPENDED') {
      throw new UnauthorizedException('This account has been suspended. Please contact administration.');
    }

    if (!user) {
      // 2. Check by email to see if account linking should be done automatically
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email, deletedAt: null },
        include: { profile: true },
      });

      if (existingUser) {
        if (existingUser.status === 'SUSPENDED') {
          throw new UnauthorizedException('This account has been suspended. Please contact administration.');
        }
        // Link this social account to the existing account
        await this.prisma.socialAccount.create({
          data: {
            userId: existingUser.id,
            provider: dto.provider,
            providerId: hashedProviderId,
          },
        });
        // Social authentication confirms email ownership
        if (!existingUser.isVerified) {
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: { isVerified: true },
          });
          existingUser.isVerified = true;
        }
        user = existingUser;
      } else {
        // 3. Register a new user with no password (verified by social provider)
        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: dto.email,
              password: null,
              role: dto.role,
              isVerified: true,
              profile: {
                create: {
                  firstName: dto.firstName || '',
                  lastName: dto.lastName || '',
                  avatarUrl: dto.avatarUrl || null,
                  phoneNumber: '',
                },
              },
            },
            include: {
              profile: true,
            },
          });

          await tx.socialAccount.create({
            data: {
              userId: newUser.id,
              provider: dto.provider,
              providerId: hashedProviderId,
            },
          });

          if (dto.role === UserRole.RIDER) {
            await tx.riderProfile.create({
              data: {
                userId: newUser.id,
                vehicleType: 'BIKE',
                vehiclePlate: 'N/A',
                licenseNo: 'N/A',
                status: RiderStatus.OFFLINE,
              },
            });
          }

          return newUser;
        });

        // Trigger Wallet Service creation
        try {
          const walletServiceUrl =
            process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
          await firstValueFrom(
            this.httpService.post(`${walletServiceUrl}/wallets`, {
              userId: user.id,
            }),
          );
        } catch (error) {
          console.error(
            `Failed to trigger wallet creation for user ${user.id}:`,
            error.message,
          );
        }
      }
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        phoneNumber: user.profile?.phoneNumber || '',
        avatarUrl: user.profile?.avatarUrl || null,
      },
      token,
    };
  }

  async linkSocialAccount(userId: string, dto: LinkSocialDto) {
    const hashedProviderId = crypto
      .createHash('sha256')
      .update(dto.providerId)
      .digest('hex');

    const existingLink = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerId: {
          provider: dto.provider,
          providerId: hashedProviderId,
        },
      },
    });

    if (existingLink) {
      if (existingLink.userId === userId) {
        return { success: true, message: 'Social account is already linked to this profile' };
      }
      throw new ConflictException('This social account is already linked to another profile');
    }

    await this.prisma.socialAccount.create({
      data: {
        userId,
        provider: dto.provider,
        providerId: hashedProviderId,
      },
    });

    return { success: true, message: `Successfully linked ${dto.provider} account` };
  }

  async addPassword(userId: string, dto: AddPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.password) {
      throw new ConflictException('Password has already been set for this account. Use change-password instead.');
    }

    const hashedPassword = await this.auth.hashPassword(dto.password);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password set successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new BadRequestException('No password set for this account. Please use add-password instead.');
    }

    const isMatch = await this.auth.comparePassword(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect old password');
    }

    const hashedPassword = await this.auth.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async assignRiderToZones(userId: string, zoneIds: string[]) {
    // Check if rider profile exists
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!rider) {
      throw new NotFoundException(`Rider profile for user ${userId} not found`);
    }

    // Assign to zones inside a transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete existing assignments
      await tx.riderZone.deleteMany({
        where: { riderId: userId },
      });

      // Create new assignments
      if (zoneIds && zoneIds.length > 0) {
        await tx.riderZone.createMany({
          data: zoneIds.map((zoneId) => ({
            riderId: userId,
            zoneId,
          })),
        });
      }
    });

    return { success: true, message: 'Rider operating zones updated successfully' };
  }

  async getRiderZones(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId },
    });
    if (!rider) {
      throw new NotFoundException(`Rider profile for user ${userId} not found`);
    }

    const riderZones = await this.prisma.riderZone.findMany({
      where: { riderId: userId },
    });

    const zoneIds = riderZones.map((rz) => rz.zoneId);

    // Fetch details of these zones
    const zones = await this.prisma.zone.findMany({
      where: {
        id: { in: zoneIds },
      },
    });

    return zones;
  }

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const cleanEmail = dto.email.trim();
    const purpose = dto.purpose || 'EMAIL_VERIFICATION';

    // Check if the user exists
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (!user) {
      throw new NotFoundException('No account found with this email address');
    }

    // Invalidate any previous unused OTPs for this email/purpose
    await this.prisma.otpRecord.updateMany({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        purpose,
        used: false,
      },
      data: { used: true },
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.otpRecord.create({
      data: { email: user.email, otpHash, purpose, expiresAt },
    });

    // Send email
    await this.emailService.sendOtpEmail(user.email, otp, purpose);

    return { message: `OTP sent to ${user.email}. It expires in 10 minutes.` };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string; verified: boolean; token?: string | null; user?: any }> {
    const cleanEmail = dto.email.trim();
    const { otp, purpose = 'EMAIL_VERIFICATION' } = dto;

    // Fetch the most recent unused, non-expired OTP for this email/purpose
    const record = await this.prisma.otpRecord.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        purpose,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('OTP is invalid or has expired. Please request a new one.');
    }

    const isMatch = await bcrypt.compare(otp, record.otpHash);
    if (!isMatch) {
      throw new BadRequestException('Incorrect OTP code. Please try again.');
    }

    // Mark OTP as used
    await this.prisma.otpRecord.update({
      where: { id: record.id },
      data: { used: true },
    });

    let token: string | null = null;
    let userPayload: any = null;

    // If purpose is EMAIL_VERIFICATION, mark user as verified and generate auth token
    if (purpose === 'EMAIL_VERIFICATION') {
      const user = await this.prisma.user.findFirst({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
          deletedAt: null,
        },
        include: { profile: true },
      });

      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { isVerified: true, lastLoginAt: new Date() },
        });

        token = await this.generateToken(user.id, user.email, user.role);
        userPayload = {
          id: user.id,
          email: user.email,
          role: user.role,
          isVerified: true,
          firstName: user.profile?.firstName,
          lastName: user.profile?.lastName,
          phoneNumber: user.profile?.phoneNumber,
        };
      }
    }

    return {
      message: 'OTP verified successfully.',
      verified: true,
      token,
      user: userPayload,
    };
  }


  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string; success: boolean }> {
    const { email, otp, newPassword } = dto;

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters long");
    }

    const record = await this.prisma.otpRecord.findFirst({
      where: {
        email,
        purpose: "PASSWORD_RESET",
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new BadRequestException("Password reset code is invalid or has expired. Please request a new one.");
    }

    const isMatch = await bcrypt.compare(otp, record.otpHash);
    if (!isMatch) {
      throw new BadRequestException("Incorrect verification code. Please check your email and try again.");
    }

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException("No account found with this email address");
    }

    const hashedPassword = await this.auth.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isVerified: true,
      },
    });

    await this.prisma.otpRecord.update({
      where: { id: record.id },
      data: { used: true },
    });

    return { message: "Password has been reset successfully. Please log in with your new password.", success: true };
  }

  private async generateToken(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    return this.jwtService.signAsync(payload);
  }
}
