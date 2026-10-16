import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet-service.service';
import { AuthGuard } from 'libs/guards';
import { CurrentUser, Public } from 'libs/decorators';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from 'libs/common';

@ApiTags('Wallet')
@Controller('wallets')
export class WalletServiceController {
  constructor(private readonly walletService: WalletService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Internal: Create a wallet and virtual account for a user' })
  async createWallet(@Body('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.walletService.createWallet(userId);
  }

  @Get('me/balance')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet balance and virtual account details' })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Post('me/virtual-account')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a dynamic virtual account on demand for deposit (auto-funded after 15s in test mode)' })
  async refreshVirtualAccount(@CurrentUser('id') userId: string) {
    return this.walletService.refreshVirtualAccount(userId, true, 10000, 15);
  }

  @Post('me/fund')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test/Dev Mode: Trigger wallet funding with custom amount and delay (default 15s)' })
  async fundWallet(
    @CurrentUser('id') userId: string,
    @Body('amount') amount?: number,
    @Body('delaySeconds') delaySeconds?: number,
  ) {
    return this.walletService.fundWalletTestMode(userId, amount, delaySeconds);
  }


  @Get('me/transactions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet transactions' })
  async getTransactions(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.walletService.getTransactions(userId, query);
  }

  @Public()
  @Get('transactions')
  @ApiOperation({ summary: 'Internal/Admin: list system-wide transactions (paginated)' })
  async getAllTransactions(@Query() query: PaginationQueryDto & { userId?: string }) {
    const targetUserId = query.userId || 'ALL';
    return this.walletService.getTransactions(targetUserId, query);
  }

  // Internal downstream communication endpoints
  @Public()
  @Get('users/:userId/balance')
  @ApiOperation({ summary: 'Internal: check balance of a specific user' })
  async getUserBalance(@Param('userId') userId: string) {
    return this.walletService.getBalance(userId);
  }

  @Public()
  @Post('deduct')
  @ApiOperation({ summary: 'Internal: deduct units from a user wallet' })
  async deductUnits(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('reference') reference: string,
  ) {
    if (!userId || !amount || !reference) {
      throw new BadRequestException('userId, amount, and reference are required');
    }
    return this.walletService.deductUnits(userId, amount, reference);
  }

  @Public()
  @Post('refund')
  @ApiOperation({ summary: 'Internal: refund units to a user wallet' })
  async refundUnits(
    @Body('userId') userId: string,
    @Body('amount') amount: number,
    @Body('reference') reference: string,
  ) {
    if (!userId || !amount || !reference) {
      throw new BadRequestException('userId, amount, and reference are required');
    }
    return this.walletService.refundUnits(userId, amount, reference);
  }

  @Public()
  @Post('webhook/safehaven')
  @ApiOperation({ summary: 'SafeHaven transaction webhook' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-safehaven-signature') signature: string,
  ) {
    // For MVP, we log the signature and process the payload
    console.log(`Received SafeHaven Webhook. Signature: ${signature}`);
    return this.walletService.handleSafeHavenWebhook(payload);
  }
}
