import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'libs/prisma';
import { HttpService } from '@nestjs/axios';
import { SafeHavenService } from './safehaven.service';
import { TransactionType, TransactionStatus } from 'libs/constants';
import { firstValueFrom } from 'rxjs';
import { PaginationQueryDto, buildPaginatedResponse } from 'libs/common';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private safeHaven: SafeHavenService,
  ) {}

  async createWallet(userId: string) {
    const existing = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Wallet already exists for this user');
    }

    // 1. Create wallet first so user wallet setup never fails
    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });

    // 2. Attempt initial virtual account provisioning safely
    let virtualAcc: any = null;
    try {
      virtualAcc = await this.refreshVirtualAccount(userId);
    } catch (err) {
      this.logger.warn(
        `Initial virtual account provision deferred for user ${userId}: ${err.message}`,
      );
    }

    return { wallet, virtualAcc };
  }

  /**
   * Auto-funds the user's wallet after a delay (default 15 seconds) in test/sandbox mode.
   */
  scheduleAutoFunding(userId: string, accountNumber: string, amount = 10000, delayMs = 15000) {
    this.logger.log(
      `[TEST MODE] Scheduled auto-funding of ₦${amount} for user ${userId} on virtual account ${accountNumber} in ${delayMs / 1000} seconds...`,
    );

    setTimeout(async () => {
      try {
        const reference = `SAFEHAVEN_TEST_DEP_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        await this.handleSafeHavenWebhook({
          event: 'transfer.success',
          data: {
            accountNumber,
            amount,
            reference,
          },
        });
        this.logger.log(
          `[TEST MODE AUTO-FUND SUCCESS] Credited ₦${amount} to user ${userId} (Account: ${accountNumber}, Ref: ${reference})`,
        );
      } catch (err) {
        this.logger.error(`[TEST MODE AUTO-FUND FAILED] User ${userId}: ${err.message}`);
      }
    }, delayMs);
  }

  /**
   * Generates or updates a dynamic virtual account on demand for deposits.
   * Automatically schedules test mode funding after 15 seconds.
   */
  async refreshVirtualAccount(userId: string, autoFund = true, amount = 10000, delaySeconds = 15) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    let userDetails: any = null;
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
      const response = await firstValueFrom(
        this.httpService.get(`${userServiceUrl}/users/${userId}`),
      );
      userDetails = response.data?.data || response.data;
    } catch (err) {
      this.logger.warn(`Could not fetch user details for virtual account refresh: ${err.message}`);
    }

    if (!userDetails) {
      userDetails = {
        firstName: 'User',
        lastName: userId.slice(0, 8),
        email: `user_${userId}@pickam.com`,
        phoneNumber: '+2348000000000',
      };
    }

    const virtualAccountInfo = await this.safeHaven.generateVirtualAccount(
      userDetails.firstName || 'User',
      userDetails.lastName || '',
      userDetails.email || '',
      userDetails.phoneNumber || '+2348000000000',
    );

    let virtualAccount = await this.prisma.virtualAccount.findUnique({
      where: { walletId: wallet.id },
    });

    if (!virtualAccount) {
      virtualAccount = await this.prisma.virtualAccount.create({
        data: {
          walletId: wallet.id,
          bankName: virtualAccountInfo.bankName,
          accountName: virtualAccountInfo.accountName,
          accountNumber: virtualAccountInfo.accountNumber,
          provider: virtualAccountInfo.provider,
          expiresAt: virtualAccountInfo.expiresAt,
        },
      });
    } else {
      virtualAccount = await this.prisma.virtualAccount.update({
        where: { walletId: wallet.id },
        data: {
          bankName: virtualAccountInfo.bankName,
          accountName: virtualAccountInfo.accountName,
          accountNumber: virtualAccountInfo.accountNumber,
          provider: virtualAccountInfo.provider,
          expiresAt: virtualAccountInfo.expiresAt,
        },
      });
    }

    this.logger.log(`Provisioned new temporary SafeHaven virtual account for user ${userId}`);

    if (autoFund) {
      this.scheduleAutoFunding(userId, virtualAccount.accountNumber, amount, delaySeconds * 1000);
    }

    return {
      virtualAccount,
      autoFunding: autoFund
        ? {
            enabled: true,
            amount,
            delaySeconds,
            message: `Test Mode: Wallet will be automatically credited with ₦${amount.toLocaleString()} in ${delaySeconds} seconds.`,
          }
        : null,
    };
  }

  async fundWalletTestMode(userId: string, requestedAmount?: number, requestedDelay?: number) {
    const amount = Number(requestedAmount) || 10000;
    const delaySeconds = requestedDelay !== undefined ? Number(requestedDelay) : 15;

    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      const created = await this.createWallet(userId);
      wallet = created.wallet;
    }

    let virtualAccount = await this.prisma.virtualAccount.findUnique({
      where: { walletId: wallet.id },
    });

    if (!virtualAccount || (virtualAccount.expiresAt && new Date() > new Date(virtualAccount.expiresAt))) {
      const refreshed = await this.refreshVirtualAccount(userId, false);
      virtualAccount = refreshed.virtualAccount;
    }

    this.scheduleAutoFunding(userId, virtualAccount.accountNumber, amount, delaySeconds * 1000);

    return {
      success: true,
      message: delaySeconds > 0
        ? `Funding initiated! ₦${amount.toLocaleString()} will be credited to your wallet in ${delaySeconds} seconds.`
        : `Funding initiated! ₦${amount.toLocaleString()} is being credited to your wallet.`,
      amount,
      scheduledInSeconds: delaySeconds,
      virtualAccount: {
        id: virtualAccount.id,
        bankName: virtualAccount.bankName,
        accountName: virtualAccount.accountName,
        accountNumber: virtualAccount.accountNumber,
        provider: virtualAccount.provider,
        expiresAt: virtualAccount.expiresAt,
      },
    };
  }

  async getBalance(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      const created = await this.createWallet(userId);
      wallet = created.wallet;
    }

    let virtualAccount = await this.prisma.virtualAccount.findUnique({
      where: { walletId: wallet.id },
    });

    if (!virtualAccount || (virtualAccount.expiresAt && new Date() > new Date(virtualAccount.expiresAt))) {
      try {
        const refreshed = await this.refreshVirtualAccount(userId, false);
        virtualAccount = refreshed.virtualAccount;
      } catch (err) {
        this.logger.warn(`Failed to auto-refresh dynamic virtual account for user ${userId}: ${err.message}`);
      }
    }

    return {
      userId: wallet.userId,
      balance: Number(wallet.balance),
      virtualAccount,
    };
  }

  async deductUnits(userId: string, amount: number, reference: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const currentBalance = Number(wallet.balance);
    if (currentBalance < amount) {
      throw new BadRequestException('Insufficient units in wallet balance');
    }

    // Check if transaction ref exists to make it idempotent
    const checkTx = await this.prisma.transaction.findUnique({
      where: { reference },
    });
    if (checkTx) {
      return { success: true, message: 'Transaction already processed (idempotent)' };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: updatedWallet.id,
          amount,
          type: TransactionType.DEBIT,
          status: TransactionStatus.SUCCESS,
          reference,
          description: `Debit for order: ${reference}`,
        },
      });

      return { balance: Number(updatedWallet.balance), transaction };
    });

    return result;
  }

  async refundUnits(userId: string, amount: number, reference: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Check if already refunded to prevent double refunds
    const checkTx = await this.prisma.transaction.findUnique({
      where: { reference },
    });
    if (checkTx) {
      return { success: true, message: 'Refund already processed (idempotent)' };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          walletId: updatedWallet.id,
          amount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.SUCCESS,
          reference,
          description: `Refund for order: ${reference.replace('refund_', '')}`,
        },
      });

      return { balance: Number(updatedWallet.balance), transaction };
    });

    return result;
  }

  async getTransactions(userId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId !== 'ALL') {
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      where.walletId = wallet.id;
    }

    if (query.search) {
      where.OR = [
        { reference: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.type) {
      where.type = query.type.toUpperCase();
    }
    if (query.status) {
      where.status = query.status.toUpperCase();
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

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      walletId: t.walletId,
      amount: Number(t.amount),
      type: t.type,
      status: t.status,
      reference: t.reference,
      description: t.description,
      createdAt: t.createdAt,
    }));

    return buildPaginatedResponse(formattedTransactions, total, page, limit);
  }

  async handleSafeHavenWebhook(payload: any) {
    const { event, data } = payload;
    if (event !== 'transfer.success' || !data) {
      return { status: 'ignored', message: 'Event type not supported' };
    }

    const { accountNumber, amount, reference } = data;
    if (!accountNumber || !amount || !reference) {
      throw new BadRequestException('Invalid webhook data parameters');
    }

    const virtualAcc = await this.prisma.virtualAccount.findUnique({
      where: { accountNumber },
    });

    if (!virtualAcc) {
      throw new NotFoundException(
        `Virtual account not found for number: ${accountNumber}`,
      );
    }

    // Idempotency check
    const existingTx = await this.prisma.transaction.findUnique({
      where: { reference },
    });
    if (existingTx) {
      return {
        status: 'ignored',
        message: 'Webhook transaction reference already processed',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: virtualAcc.walletId },
        data: {
          balance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: virtualAcc.walletId,
          amount,
          type: TransactionType.CREDIT,
          status: TransactionStatus.SUCCESS,
          reference,
          description: `Virtual Account Transfer Deposit`,
        },
      });
    });

    return { status: 'success', message: 'Wallet credited successfully' };
  }
}
