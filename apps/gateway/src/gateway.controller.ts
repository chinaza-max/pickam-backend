import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AuthGuard, RolesGuard } from 'libs/guards';
import { Public, Roles, CurrentUser } from 'libs/decorators';
import { firstValueFrom } from 'rxjs';
import { UserRole } from 'libs/constants';
import {
  RegisterDto,
  LoginDto,
  UpdateProfileDto,
  UpdateRiderProfileDto,
  CreateOrderDto,
  UpdateOrderStatusDto,
  AssignRiderDto,
  CreateStateDto,
  CreateZoneDto,
  CreateLandmarkDto,
  CreatePricingMatrixDto,
  SocialLoginDto,
  LinkSocialDto,
  AddPasswordDto,
  ChangePasswordDto,
  AdminUpdateUserDto,
  GetStateByCoordinatesDto,
  GetZonesByStateDto,
  GetLandmarksByZoneDto,
  FundWalletDto,
  CreateDropOffPartnerDto,
  UpdateDropOffPartnerDto,
} from 'libs/dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProduces, ApiQuery } from '@nestjs/swagger';
import { PaginationQueryDto } from 'libs/common';

@Controller()
export class GatewayController {
  constructor(private readonly httpService: HttpService) {}

  private async forward(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    path: string,
    body?: any,
    query?: any,
    user?: any,
  ) {
    const headers: any = {};
    if (user) {
      headers['x-user-id'] = user.sub || user.id;
      headers['x-user-email'] = user.email;
      headers['x-user-role'] = user.role;
    }

    let targetUrl = '';
    if (
      path.startsWith('/auth') ||
      path.startsWith('/profiles') ||
      path.startsWith('/riders/profile') ||
      path.startsWith('/admin/users') ||
      path.startsWith('/riders')
    ) {
      targetUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    } else if (path.startsWith('/wallets')) {
      targetUrl = process.env.WALLET_SERVICE_URL || 'http://localhost:3002';
    } else if (path.startsWith('/orders')) {
      targetUrl = process.env.ORDER_SERVICE_URL || 'http://localhost:3003';
    } else if (path.startsWith('/notifications')) {
      targetUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
    } else if (path.startsWith('/admin') || path.startsWith('/locations')) {
      targetUrl = process.env.ADMIN_SERVICE_URL || 'http://localhost:3005';
    } else {
      throw new HttpException(
        'Route not mapped inside Gateway',
        HttpStatus.NOT_FOUND,
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request({
          method,
          url: `${targetUrl}${path}`,
          data: body,
          params: query,
          headers,
        }),
      );
      return response.data;
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        const errData = err.response.data;
        throw new HttpException(errData, status);
      }
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==========================================
  // AUTH & USERS (USER SERVICE)
  // ==========================================
  @ApiTags('Auth & Profiles')
  @Public()
  @Post('auth/register')
  @ApiOperation({ summary: 'Register a customer, rider, or admin' })
  async register(@Body() dto: RegisterDto) {
    return this.forward('post', '/auth/register', dto);
  }

  @ApiTags('Auth & Profiles')
  @Public()
  @Post('auth/login')
  @ApiOperation({ summary: 'Authenticate email and password' })
  async login(@Body() dto: LoginDto) {
    return this.forward('post', '/auth/login', dto);
  }

  @ApiTags('Auth & Profiles')
  @Public()
  @Post('auth/social-login')
  @ApiOperation({ summary: 'Authenticate or register via Google/Apple social login' })
  async socialLogin(@Body() dto: SocialLoginDto) {
    return this.forward('post', '/auth/social-login', dto);
  }

  @ApiTags("Auth & Profiles")
  @Public()
  @Post("auth/send-otp")
  @ApiOperation({ summary: "Send a 6-digit OTP code to an email address" })
  async sendOtp(@Body() dto: any) {
    return this.forward("post", "/auth/send-otp", dto);
  }

  @ApiTags("Auth & Profiles")
  @Public()
  @Post("auth/verify-otp")
  @ApiOperation({ summary: "Verify a 6-digit OTP code sent to an email address" })
  async verifyOtp(@Body() dto: any) {
    return this.forward("post", "/auth/verify-otp", dto);
  }

  @ApiTags("Auth & Profiles")
  @Public()
  @Post("auth/forgot-password")
  @ApiOperation({ summary: "Request a password reset OTP sent to email" })
  async forgotPassword(@Body() dto: any) {
    return this.forward("post", "/auth/forgot-password", dto);
  }

  @ApiTags("Auth & Profiles")
  @Public()
  @Post("auth/reset-password")
  @ApiOperation({ summary: "Reset user password using OTP" })
  async resetPassword(@Body() dto: any) {
    return this.forward("post", "/auth/reset-password", dto);
  }

  @ApiTags('Auth & Profiles')
  @Get('profiles/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile details' })
  async getProfile(@CurrentUser() user: any) {
    return this.forward('get', '/profiles/me', null, null, user);
  }

  @ApiTags('Auth & Profiles')
  @Put('profiles/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile details of current user' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.forward('put', '/profiles/me', dto, null, user);
  }

  @ApiTags('Auth & Profiles')
  @Post('profiles/link-social')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a new Google or Apple social account' })
  async linkSocial(@CurrentUser() user: any, @Body() dto: LinkSocialDto) {
    return this.forward('post', '/profiles/link-social', dto, null, user);
  }

  @ApiTags('Auth & Profiles')
  @Post('profiles/add-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set password for a social-only registered account' })
  async addPassword(@CurrentUser() user: any, @Body() dto: AddPasswordDto) {
    return this.forward('post', '/profiles/add-password', dto, null, user);
  }

  @ApiTags('Auth & Profiles')
  @Post('profiles/change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.forward('post', '/profiles/change-password', dto, null, user);
  }

  @ApiTags('Auth & Profiles')
  @Put('riders/profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider profile (Riders only)' })
  async updateRiderProfile(@CurrentUser() user: any, @Body() dto: UpdateRiderProfileDto) {
    return this.forward('put', '/riders/profile', dto, null, user);
  }

  // ==========================================
  // ADMIN USER MANAGEMENT (USER SERVICE)
  // ==========================================
  @ApiTags('Admin — User Management')
  @Get('admin/users')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List all users with pagination, search, and filters' })
  async listUsers(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/admin/users', null, query, user);
  }

  @ApiTags('Admin — User Management')
  @Get('admin/users/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get full user profile details by ID' })
  async getUserById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('get', `/admin/users/${id}`, null, null, user);
  }

  @ApiTags('Admin — User Management')
  @Put('admin/users/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update user role, status, or profile information' })
  async updateUser(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.forward('put', `/admin/users/${id}`, dto, null, user);
  }

  @ApiTags('Admin — User Management')
  @Post('admin/users/:id/suspend')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Suspend a user account' })
  async suspendUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('post', `/admin/users/${id}/suspend`, null, null, user);
  }

  @ApiTags('Admin — User Management')
  @Post('admin/users/:id/activate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Activate a suspended user account' })
  async activateUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('post', `/admin/users/${id}/activate`, null, null, user);
  }

  @ApiTags('Admin — User Management')
  @Delete('admin/users/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Soft delete a user account' })
  async softDeleteUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('delete', `/admin/users/${id}`, null, null, user);
  }

  @ApiTags('Admin — User Management')
  @Get('admin/users/:id/wallet')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: View a user's wallet balance and virtual account" })
  async viewUserWallet(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('get', `/admin/users/${id}/wallet`, null, null, user);
  }

  @ApiTags('Admin — User Management')
  @Get('admin/users/:id/orders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Admin: View a user's paginated order history" })
  async viewUserOrders(@CurrentUser() user: any, @Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.forward('get', `/admin/users/${id}/orders`, null, query, user);
  }

  // ==========================================
  // WALLET (WALLET SERVICE)
  // ==========================================
  @ApiTags('Wallet Operations')
  @Get('wallets/me/balance')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user wallet balance and bank details' })
  async getBalance(@CurrentUser() user: any) {
    return this.forward('get', '/wallets/me/balance', null, null, user);
  }

  @ApiTags('Wallet Operations')
  @Post('wallets/me/virtual-account')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a fresh dynamic virtual account on demand for deposits (auto-credited after 15s in test mode)' })
  @ApiResponse({
    status: 201,
    description: 'Dynamic virtual account generated and 15s test funding scheduled',
    schema: {
      example: {
        success: true,
        data: {
          virtualAccount: {
            id: 'va-uuid-1234',
            bankName: 'SafeHaven MFB (Sandbox)',
            accountName: 'John Doe',
            accountNumber: '9912345678',
            provider: 'SAFEHAVEN_MOCK',
            expiresAt: '2026-08-22T19:30:00.000Z'
          },
          autoFunding: {
            enabled: true,
            amount: 10000,
            delaySeconds: 15,
            message: 'Test Mode: Wallet will be automatically credited with ₦10,000 in 15 seconds.'
          }
        },
        error: null
      }
    }
  })
  async refreshVirtualAccount(@CurrentUser() user: any) {
    return this.forward('post', '/wallets/me/virtual-account', null, null, user);
  }

  @ApiTags('Wallet Operations')
  @Post('wallets/me/fund')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Test/Dev Mode: Trigger wallet funding with custom amount and delay (default 15s)' })
  @ApiResponse({
    status: 201,
    description: 'Wallet funding scheduled or credited',
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          message: 'Funding initiated! ₦10,000 will be credited to your wallet in 15 seconds.',
          amount: 10000,
          scheduledInSeconds: 15,
          virtualAccount: {
            id: 'va-uuid-1234',
            bankName: 'SafeHaven MFB (Sandbox)',
            accountName: 'John Doe',
            accountNumber: '9912345678',
            provider: 'SAFEHAVEN_MOCK'
          }
        },
        error: null
      }
    }
  })
  async fundWallet(@CurrentUser() user: any, @Body() dto: FundWalletDto) {
    return this.forward('post', '/wallets/me/fund', dto, null, user);
  }

  @ApiTags('Wallet Operations')
  @Get('wallets/me/transactions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve paginated transaction history logs' })
  async getTransactions(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/wallets/me/transactions', null, query, user);
  }

  @ApiTags('Admin — Audit Logs')
  @Get('admin/wallets/transactions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Retrieve system-wide paginated wallet transaction audit log' })
  async getAllTransactions(@CurrentUser() user: any, @Query() query: PaginationQueryDto & { userId?: string }) {
    return this.forward('get', '/wallets/transactions', null, query, user);
  }

  @ApiTags('Wallet Operations')
  @Public()
  @Post('wallets/webhook/safehaven')
  @ApiOperation({ summary: 'Process transfer deposits from SafeHaven virtual account' })
  async handleWebhook(@Body() payload: any) {
    return this.forward('post', '/wallets/webhook/safehaven', payload);
  }

  // ==========================================
  // ORDERS (ORDER SERVICE)
  // ==========================================
  @ApiTags('Delivery Orders')
  @Post('orders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a delivery order (Customers only)' })
  async createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.forward('post', '/orders', dto, null, user);
  }

  @ApiTags('Delivery Orders')
  @Post('orders/:id/assign-rider')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign a rider to a pending delivery (Admin only)' })
  async assignRider(@CurrentUser() user: any, @Param('id') orderId: string, @Body() dto: AssignRiderDto) {
    return this.forward('post', `/orders/${orderId}/assign-rider`, dto, null, user);
  }

  @ApiTags('Delivery Orders — Rider')
  @Post('orders/:id/accept')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rider accepts a pending order (Riders only)' })
  async acceptOrder(@CurrentUser() user: any, @Param('id') orderId: string) {
    return this.forward('post', `/orders/${orderId}/accept`, null, null, user);
  }

  @ApiTags('Delivery Orders — Rider')
  @Post('orders/:id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rider rejects/declines an assigned order' })
  async rejectOrder(@CurrentUser() user: any, @Param('id') orderId: string) {
    return this.forward('post', `/orders/${orderId}/reject`, null, null, user);
  }

  @ApiTags('Delivery Orders — Rider')
  @Get('orders/available')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available pending orders for riders to pick up' })
  async getAvailableOrders(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/orders/available', null, query, user);
  }

  @ApiTags('Delivery Orders')
  @Put('orders/:id/status')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order delivery status (Riders or Admins)' })
  async updateStatus(@CurrentUser() user: any, @Param('id') orderId: string, @Body() dto: UpdateOrderStatusDto) {
    return this.forward('put', `/orders/${orderId}/status`, dto, null, user);
  }

  @ApiTags('Delivery Orders')
  @Post('orders/:id/cancel')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order and refund units' })
  async cancelOrder(@CurrentUser() user: any, @Param('id') orderId: string) {
    return this.forward('post', `/orders/${orderId}/cancel`, null, null, user);
  }

  @ApiTags('Delivery Orders')
  @Post('orders/:id/confirm-receipt')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Customer confirms package receipt, releasing payment to courier' })
  async confirmReceipt(@CurrentUser() user: any, @Param('id') orderId: string) {
    return this.forward('post', `/orders/${orderId}/confirm-receipt`, null, null, user);
  }

  @ApiTags('Delivery Orders')
  @Get('orders/history')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated list of past orders' })
  async getHistory(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/orders/history', null, query, user);
  }

  @ApiTags('Delivery Orders')
  @Get('orders/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed order tracking state' })
  async getOrder(@CurrentUser() user: any, @Param('id') orderId: string) {
    return this.forward('get', `/orders/${orderId}`, null, null, user);
  }

  // ==========================================
  // NOTIFICATIONS (NOTIFICATION SERVICE)
  // ==========================================
  @ApiTags('Notifications')
  @Get('notifications/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated notification history for current user' })
  async getMyNotifications(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/notifications/me', null, query, user);
  }

  @ApiTags('Notifications')
  @Get('notifications/me/unread-count')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get count of unread notifications for current user' })
  async getUnreadNotificationCount(@CurrentUser() user: any) {
    return this.forward('get', '/notifications/me/unread-count', null, null, user);
  }

  @ApiTags('Notifications')
  @Post('notifications/fcm-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register/refresh FCM push notification token for current user' })
  async registerFcmToken(@CurrentUser() user: any, @Body() body: { fcmToken: string }) {
    return this.forward('post', '/notifications/fcm-token', body, null, user);
  }

  @ApiTags('Notifications')
  @Patch('notifications/:id/read')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markNotificationAsRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('patch', `/notifications/${id}/read`, null, null, user);
  }

  @ApiTags('Notifications')
  @Patch('notifications/me/read-all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllNotificationsAsRead(@CurrentUser() user: any) {
    return this.forward('patch', '/notifications/me/read-all', null, null, user);
  }

  @ApiTags('Notifications')
  @Post('notifications/test')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test push/in-app notification to the current user' })
  async sendTestNotification(@CurrentUser() user: any) {
    const userId = user.sub || user.id;
    return this.forward(
      'post',
      '/notifications',
      {
        userId,
        title: 'PickAm Rider Alerts 🛵',
        message: 'Push notification & sound chime test successful! You are ready for live orders.',
        type: 'TEST_NOTIFICATION',
        data: { test: 'true' },
      },
      null,
      null,
    );
  }

  @ApiTags('Admin — Audit Logs')
  @Get('admin/notifications')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Retrieve paginated system-wide notification log' })
  async getAllNotifications(@CurrentUser() user: any, @Query() query: PaginationQueryDto & { userId?: string }) {
    return this.forward('get', '/notifications', null, query, user);
  }

  @ApiTags('Admin — Notifications')
  @Post('admin/notifications/broadcast')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Broadcast push notification to topic (riders, customers, or all)' })
  async broadcastNotification(@CurrentUser() user: any, @Body() body: any) {
    return this.forward('post', '/notifications/broadcast', body, null, user);
  }

  // ==========================================
  // USER LOCATION & GEOCODING
  // ==========================================
  @ApiTags('User Location & Geocoding')
  @Public()
  @Get('locations/state-by-coordinates')
  @ApiProduces('application/json')
  @ApiOperation({ summary: 'Public: Reverse geocode coordinates to get state (via Nominatim)' })
  @ApiQuery({ name: 'latitude', required: false, example: 6.5244, description: 'Latitude coordinate' })
  @ApiQuery({ name: 'longitude', required: false, example: 3.3792, description: 'Longitude coordinate' })
  @ApiResponse({
    status: 200,
    description: 'Reverse geocoded location metadata and matched database State record',
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          coordinates: { latitude: 6.5244, longitude: 3.3792 },
          geocoded: {
            rawState: 'Lagos State',
            cleanedStateName: 'Lagos',
            isoCode: 'NG-LA',
            stateCode: 'LA',
            displayName: 'Tizeti HQ Test Address, Eletu Odibo Street, Akoka, Shomolu, Lagos State, 102216, Nigeria',
            address: {
              amenity: 'Tizeti HQ Test Address',
              road: 'Eletu Odibo Street',
              residential: 'Akoka',
              suburb: 'Akoka',
              county: 'Shomolu',
              state: 'Lagos State',
              'ISO3166-2-lvl4': 'NG-LA',
              postcode: '102216',
              country: 'Nigeria',
              country_code: 'ng'
            }
          },
          matchedState: {
            id: '0c3c416a-14a9-4fa3-8dd6-b19f9464944b',
            name: 'Lagos',
            code: 'LA',
            status: 'ACTIVE',
            activeZonesCount: 1,
            zones: [
              { id: 'zone-uuid-1', name: 'Ikeja', basePrice: 500, status: 'ACTIVE' }
            ]
          }
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request — Missing or invalid latitude/longitude parameters' })
  async getStateByCoordinatesGet(@Query() query: GetStateByCoordinatesDto) {
    return this.forward('get', '/locations/state-by-coordinates', null, query);
  }

  @ApiTags('User Location & Geocoding')
  @Public()
  @Post('locations/state-by-coordinates')
  @ApiProduces('application/json')
  @ApiOperation({ summary: 'Public: Reverse geocode coordinates to get state (via Nominatim)' })
  @ApiResponse({
    status: 200,
    description: 'Reverse geocoded location metadata and matched database State record',
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          coordinates: { latitude: 6.4584, longitude: 7.5464 },
          geocoded: {
            rawState: 'Enugu State',
            cleanedStateName: 'Enugu',
            isoCode: 'NG-EN',
            stateCode: 'EN',
            displayName: 'Prince Cornelius Nnaji Street, Enugu, New Haven Layout Extension, Enugu, Enugu North, Enugu State, 400102, Nigeria',
            address: {
              road: 'Prince Cornelius Nnaji Street',
              residential: 'Enugu',
              suburb: 'New Haven Layout Extension',
              city: 'Enugu',
              county: 'Enugu North',
              state: 'Enugu State',
              'ISO3166-2-lvl4': 'NG-EN',
              postcode: '400102',
              country: 'Nigeria',
              country_code: 'ng'
            }
          },
          matchedState: {
            id: '49bd6b96-294d-41f6-950d-a0e40d2ec2f6',
            name: 'Enugu',
            code: 'EN',
            status: 'ACTIVE',
            activeZonesCount: 0,
            zones: []
          }
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request — Missing or invalid latitude/longitude parameters' })
  async getStateByCoordinatesPost(@Body() dto: GetStateByCoordinatesDto) {
    return this.forward('post', '/locations/state-by-coordinates', dto);
  }

  @ApiTags('User Location & Geocoding')
  @Public()
  @Get('locations/zones-by-state')
  @ApiProduces('application/json')
  @ApiOperation({ summary: 'Public: Get delivery zones in a state by stateId or state name' })
  @ApiQuery({ name: 'state', required: false, example: 'Kaduna' })
  @ApiQuery({ name: 'stateId', required: false, example: 'state-uuid-1234' })
  @ApiResponse({
    status: 200,
    description: 'List of active delivery zones in the specified state',
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          state: {
            id: 'db05d24f-0f06-4bb2-9cbd-f1d7f3d792aa',
            name: 'Kaduna',
            code: 'KD',
            status: 'ACTIVE'
          },
          totalZones: 1,
          zones: [
            {
              id: '028798e0-4dd5-4890-8f97-61111625e375',
              name: 'gwagwalada',
              stateId: 'db05d24f-0f06-4bb2-9cbd-f1d7f3d792aa',
              basePrice: 3000,
              status: 'ACTIVE',
              landmarksCount: 1,
              createdAt: '2026-08-06T00:40:20.002Z',
              updatedAt: '2026-08-06T17:37:20.819Z'
            }
          ]
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Not Found — Specified state does not exist in database' })
  async getZonesByStateGet(@Query() query: GetZonesByStateDto) {
    return this.forward('get', '/locations/zones-by-state', null, query);
  }

  @ApiTags('User Location & Geocoding')
  @Public()
  @Post('locations/zones-by-state')
  @ApiProduces('application/json')
  @ApiOperation({ summary: 'Public: Get delivery zones in a state by stateId or state name' })
  @ApiResponse({
    status: 200,
    description: 'List of active delivery zones in the specified state',
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          state: {
            id: 'c3e1b767-ea54-4ba1-8e12-138080f808ef',
            name: 'Abuja Federal Capital Territory',
            code: 'FC',
            status: 'ACTIVE'
          },
          totalZones: 2,
          zones: [
            {
              id: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
              name: 'kubwa',
              stateId: 'c3e1b767-ea54-4ba1-8e12-138080f808ef',
              basePrice: 1500,
              status: 'ACTIVE',
              landmarksCount: 2
            }
          ]
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Not Found — Specified state does not exist in database' })
  async getZonesByStatePost(@Body() dto: GetZonesByStateDto) {
    return this.forward('post', '/locations/zones-by-state', dto);
  }

  @ApiTags('User Location & Geocoding')
  @Public()
  @Get('locations/landmarks-by-zone')
  @ApiProduces('application/json')
  @ApiOperation({ summary: 'Public: Get all landmarks in a zone by zoneId or zone name' })
  @ApiQuery({ name: 'zone', required: false, example: 'kubwa' })
  @ApiQuery({ name: 'zoneId', required: false, example: 'zone-uuid-1234' })
  @ApiResponse({
    status: 200,
    description: 'List of registered landmarks within the specified zone',
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          zone: {
            id: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
            name: 'kubwa',
            basePrice: 1500,
            status: 'ACTIVE',
            state: {
              id: 'c3e1b767-ea54-4ba1-8e12-138080f808ef',
              name: 'Abuja Federal Capital Territory',
              code: 'FC'
            }
          },
          totalLandmarks: 2,
          landmarks: [
            {
              id: '690cf7f3-053a-46f4-9163-055263999ebf',
              name: 'firstbank',
              zoneId: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
              createdAt: '2026-08-06T00:04:43.116Z',
              updatedAt: '2026-08-06T00:04:43.116Z'
            },
            {
              id: '10038e5d-a6ab-4ce8-9980-a7bbd5e165d1',
              name: 'kfc',
              zoneId: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
              createdAt: '2026-08-06T00:05:34.996Z',
              updatedAt: '2026-08-06T00:05:34.996Z'
            }
          ]
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Not Found — Specified delivery zone does not exist in database' })
  async getLandmarksByZoneGet(@Query() query: GetLandmarksByZoneDto) {
    return this.forward('get', '/locations/landmarks-by-zone', null, query);
  }

  @ApiTags('User Location & Geocoding')
  @Public()
  @Post('locations/landmarks-by-zone')
  @ApiProduces('application/json')
  @ApiOperation({ summary: 'Public: Get all landmarks in a zone by zoneId or zone name' })
  @ApiResponse({
    status: 200,
    description: 'List of registered landmarks within the specified zone',
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          zone: {
            id: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4',
            name: 'kubwa',
            basePrice: 1500,
            status: 'ACTIVE',
            state: {
              id: 'c3e1b767-ea54-4ba1-8e12-138080f808ef',
              name: 'Abuja Federal Capital Territory',
              code: 'FC'
            }
          },
          totalLandmarks: 2,
          landmarks: [
            {
              id: '690cf7f3-053a-46f4-9163-055263999ebf',
              name: 'firstbank',
              zoneId: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4'
            }
          ]
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Not Found — Specified delivery zone does not exist in database' })
  async getLandmarksByZonePost(@Body() dto: GetLandmarksByZoneDto) {
    return this.forward('post', '/locations/landmarks-by-zone', dto);
  }

  // ==========================================
  // ADMIN SYSTEM (ADMIN SERVICE)
  // ==========================================

  // --- States ---
  @ApiTags('Admin Operations')
  @Public()
  @Get('states/nigeria')
  @ApiOperation({ summary: 'Public: Fetch native list of all 36 Nigerian states + FCT via country-state-city' })
  async getNigeriaStates() {
    return this.forward('get', '/admin/states/nigeria', null, null);
  }

  @ApiTags('Admin Operations')
  @Post('admin/states/seed-nigeria')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Bulk seed all 36 Nigerian states + FCT into database' })
  async seedNigeriaStates(@CurrentUser() user: any) {
    return this.forward('post', '/admin/states/seed-nigeria', null, null, user);
  }

  @ApiTags('Admin Operations')
  @Public()
  @Get('states')
  @ApiProduces('application/json')
  @ApiOperation({ summary: 'Public: List all states with their active zones' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 40, description: 'Items per page (default: 40)' })
  @ApiQuery({ name: 'search', required: false, example: 'Lagos', description: 'Filter states by name' })
  @ApiQuery({ name: 'status', required: false, example: 'ACTIVE', description: 'Filter by status: ACTIVE or INACTIVE' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all states with their configured delivery zones',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'c3e1b767-ea54-4ba1-8e12-138080f808ef',
            name: 'Abuja Federal Capital Territory',
            code: 'FC',
            status: 'ACTIVE',
            createdAt: '2026-08-05T23:45:13.252Z',
            updatedAt: '2026-08-05T23:46:26.999Z',
            zones: [
              { id: 'c1c3d2a6-0f2e-4a02-a0c0-f937a9b9331d', name: 'zuba', basePrice: '1500', status: 'ACTIVE' },
              { id: '4adcca41-7d8d-481a-b8cf-b7162a35c9d4', name: 'kubwa', basePrice: '1500', status: 'ACTIVE' }
            ]
          },
          {
            id: 'bd181c9a-7141-4d2f-9439-d1ebd87d606a',
            name: 'Abia',
            code: 'AB',
            status: 'ACTIVE',
            createdAt: '2026-08-05T23:45:13.230Z',
            updatedAt: '2026-08-05T23:46:26.981Z',
            zones: []
          }
        ],
        pagination: {
          page: 1,
          limit: 40,
          total: 37,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false
        }
      }
    }
  })
  async listPublicStates(@Query() query: PaginationQueryDto) {
    return this.forward('get', '/admin/states', null, query);
  }


  @ApiTags('Admin Operations')
  @Get('admin/states')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List all states with their zones' })
  async listStates(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/admin/states', null, query, user);
  }

  @ApiTags('Admin Operations')
  @Post('admin/states')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a state (Admin only)' })
  async createState(@CurrentUser() user: any, @Body() dto: CreateStateDto) {
    return this.forward('post', '/admin/states', dto, null, user);
  }

  @ApiTags('Admin Operations')
  @Put('admin/states/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a state (Admin only)' })
  async updateState(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreateStateDto>) {
    return this.forward('put', `/admin/states/${id}`, dto, null, user);
  }

  // --- Zones ---
  @ApiTags('Admin Operations')
  @Post('admin/zones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Define a delivery zone (Admin only)' })
  async createZone(@CurrentUser() user: any, @Body() dto: CreateZoneDto) {
    return this.forward('post', '/admin/zones', dto, null, user);
  }

  @ApiTags('Admin Operations')
  @Put('admin/zones/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a delivery zone (Admin only)' })
  async updateZone(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreateZoneDto>) {
    return this.forward('put', `/admin/zones/${id}`, dto, null, user);
  }

  @ApiTags('Admin Operations')
  @Public()
  @Get('zones')
  @ApiOperation({ summary: 'Public: List delivery zones — optionally filter by ?stateId=' })
  async listPublicZones(@Query() query: PaginationQueryDto & { stateId?: string }) {
    return this.forward('get', '/admin/zones', null, query);
  }

  @ApiTags('Admin Operations')
  @Get('admin/zones')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List delivery zones — optionally filter by ?stateId=' })
  async listZones(@CurrentUser() user: any, @Query() query: PaginationQueryDto & { stateId?: string }) {
    return this.forward('get', '/admin/zones', null, query, user);
  }

  @ApiTags('Admin Operations')
  @Post('admin/landmarks')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create landmarks under a zone (Admin only)' })
  async createLandmark(@CurrentUser() user: any, @Body() dto: CreateLandmarkDto) {
    return this.forward('post', '/admin/landmarks', dto, null, user);
  }

  @ApiTags('Admin Operations')
  @Public()
  @Get('landmarks')
  @ApiOperation({ summary: 'Public: List all landmarks (paginated)' })
  async listPublicLandmarks(@Query() query: PaginationQueryDto) {
    return this.forward('get', '/admin/landmarks', null, query);
  }

  @ApiTags('Admin Operations')
  @Get('admin/landmarks')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all landmarks (paginated)' })
  async listLandmarks(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/admin/landmarks', null, query, user);
  }

  @ApiTags('Admin Operations')
  @Post('admin/pricing')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure matrix zones pricing (Admin only)' })
  async createPricing(@CurrentUser() user: any, @Body() dto: CreatePricingMatrixDto) {
    return this.forward('post', '/admin/pricing', dto, null, user);
  }

  @ApiTags('Admin Operations')
  @Put('admin/pricing/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update zone-to-zone pricing (Admin only)' })
  async updatePricing(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: Partial<CreatePricingMatrixDto>) {
    return this.forward('put', `/admin/pricing/${id}`, dto, null, user);
  }

  @ApiTags('Admin Operations')
  @Get('admin/pricing')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pricing matrix formulas (paginated, Admin only)' })
  async listPricing(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/admin/pricing', null, query, user);
  }

  @ApiTags('Admin Operations')
  @Public()
  @Get('admin/pricing/calculate')
  @ApiOperation({ summary: 'Calculate pricing between zones or landmarks (Admin path)' })
  async calculatePrice(
    @Query('fromZoneId') fromZoneId?: string,
    @Query('toZoneId') toZoneId?: string,
    @Query('fromLandmarkId') fromLandmarkId?: string,
    @Query('toLandmarkId') toLandmarkId?: string,
  ) {
    return this.forward('get', '/admin/pricing/calculate', null, {
      fromZoneId,
      toZoneId,
      fromLandmarkId,
      toLandmarkId,
    });
  }

  // ==========================================
  // PUBLIC PRICING (User-facing, no /admin prefix)
  // ==========================================
  @ApiTags('User Location & Geocoding')
  @Public()
  @Get('pricing/calculate')
  @ApiOperation({ summary: 'Public: Calculate delivery price between two zones or landmarks' })
  @ApiResponse({
    status: 200,
    description: 'Calculated delivery price between two zones or landmarks',
    schema: {
      example: {
        success: true,
        data: {
          fromZone: { id: 'zone-uuid-1', name: 'Ikeja' },
          toZone: { id: 'zone-uuid-2', name: 'Lekki' },
          price: 1200,
          currency: 'NGN'
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 404, description: 'No pricing matrix found for the given zones' })
  async calculatePricePublicGet(
    @Query('fromZoneId') fromZoneId?: string,
    @Query('toZoneId') toZoneId?: string,
    @Query('fromLandmarkId') fromLandmarkId?: string,
    @Query('toLandmarkId') toLandmarkId?: string,
  ) {
    return this.forward('get', '/admin/pricing/calculate', null, {
      fromZoneId,
      toZoneId,
      fromLandmarkId,
      toLandmarkId,
    });
  }

  @ApiTags('User Location & Geocoding')
  @Public()
  @Post('pricing/calculate')
  @ApiOperation({ summary: 'Public: Calculate delivery price between two zones or landmarks (POST Body)' })
  @ApiResponse({
    status: 200,
    description: 'Calculated delivery price between two zones or landmarks',
    schema: {
      example: {
        success: true,
        data: {
          fromZone: { id: 'zone-uuid-1', name: 'Ikeja' },
          toZone: { id: 'zone-uuid-2', name: 'Lekki' },
          price: 1200,
          currency: 'NGN'
        },
        error: null
      }
    }
  })
  @ApiResponse({ status: 404, description: 'No pricing matrix found for the given zones' })
  async calculatePricePublicPost(
    @Body() body: { fromZoneId?: string; toZoneId?: string; fromLandmarkId?: string; toLandmarkId?: string },
  ) {
    return this.forward('get', '/admin/pricing/calculate', null, {
      fromZoneId: body.fromZoneId,
      toZoneId: body.toZoneId,
      fromLandmarkId: body.fromLandmarkId,
      toLandmarkId: body.toLandmarkId,
    });
  }

  @ApiTags('Admin Operations')
  @Get('admin/pricing/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single pricing matrix entry by ID (Admin only)' })
  async getPricing(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('get', `/admin/pricing/${id}`, null, null, user);
  }

  @ApiTags('Admin Operations')
  @Delete('admin/pricing/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a pricing matrix entry (Admin only)' })
  async deletePricing(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('delete', `/admin/pricing/${id}`, null, null, user);
  }


  @ApiTags('Admin Operations')
  @Get('admin/dashboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get administrative dashboard analytics (Admin only)' })
  async getDashboard(@CurrentUser() user: any) {
    return this.forward('get', '/admin/dashboard', null, null, user);
  }

  @ApiTags('Admin Operations')
  @Get('admin/dashboard/revenue-chart')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revenue breakdown — last 14 days daily chart data (Admin only)' })
  async getRevenueChart(@CurrentUser() user: any) {
    return this.forward('get', '/admin/dashboard/revenue-chart', null, null, user);
  }

  @ApiTags('Admin Operations')
  @Get('admin/dashboard/recent-orders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Most recent 10 orders across the platform (Admin only)' })
  async getRecentOrders(@CurrentUser() user: any) {
    return this.forward('get', '/admin/dashboard/recent-orders', null, null, user);
  }

  @ApiTags('Admin — Riders')
  @Get('admin/riders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List all riders (paginated)' })
  async listRiders(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.forward('get', '/riders', null, query, user);
  }

  @ApiTags('Admin — Riders')
  @Post('admin/riders/:userId/zones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Assign rider to operating zones' })
  async assignRiderToZones(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body('zoneIds') zoneIds: string[],
  ) {
    return this.forward('post', `/riders/${userId}/zones`, { zoneIds }, null, user);
  }

  @ApiTags('Admin — Riders')
  @Get('admin/riders/:userId/zones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get rider operating zones' })
  async getRiderZones(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.forward('get', `/riders/${userId}/zones`, null, null, user);
  }

  @ApiTags('Admin — Riders')
  @Put('admin/riders/:userId/payout-settings')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Configure rider payout model (PERCENTAGE or MONTHLY salary)' })
  async updateRiderPayoutSettings(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Body() dto: { payoutType: string; commissionRate?: number; monthlySalary?: number },
  ) {
    return this.forward('put', `/riders/${userId}/payout-settings`, dto, null, user);
  }

  // ==========================================
  // DROP-OFF PARTNER ENDPOINTS (ADMIN SERVICE)
  // ==========================================

  @ApiTags('Admin — Drop-Off Partners')
  @Post('admin/drop-off-partners')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Register an emergency drop-off partner' })
  async createDropOffPartner(
    @CurrentUser() user: any,
    @Body() dto: CreateDropOffPartnerDto,
  ) {
    return this.forward('post', '/admin/drop-off-partners', dto, null, user);
  }

  @ApiTags('Admin — Drop-Off Partners')
  @Get('admin/drop-off-partners')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List emergency drop-off partners' })
  async listDropOffPartners(
    @CurrentUser() user: any,
    @Query() query: PaginationQueryDto & { landmarkId?: string; status?: string },
  ) {
    return this.forward('get', '/admin/drop-off-partners', null, query, user);
  }

  @ApiTags('Admin — Drop-Off Partners')
  @Public()
  @Get('admin/landmarks/:landmarkId/drop-off-partners')
  @ApiOperation({ summary: 'Get active emergency drop-off partners for a landmark' })
  async getDropOffPartnersByLandmark(@Param('landmarkId') landmarkId: string) {
    return this.forward('get', `/admin/landmarks/${landmarkId}/drop-off-partners`, null, null, null);
  }

  @ApiTags('Admin — Drop-Off Partners')
  @Get('admin/drop-off-partners/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get details of an emergency drop-off partner' })
  async getDropOffPartner(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('get', `/admin/drop-off-partners/${id}`, null, null, user);
  }

  @ApiTags('Admin — Drop-Off Partners')
  @Put('admin/drop-off-partners/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update an emergency drop-off partner' })
  async updateDropOffPartner(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateDropOffPartnerDto,
  ) {
    return this.forward('put', `/admin/drop-off-partners/${id}`, dto, null, user);
  }

  @ApiTags('Admin — Drop-Off Partners')
  @Delete('admin/drop-off-partners/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete an emergency drop-off partner' })
  async deleteDropOffPartner(@CurrentUser() user: any, @Param('id') id: string) {
    return this.forward('delete', `/admin/drop-off-partners/${id}`, null, null, user);
  }
}

