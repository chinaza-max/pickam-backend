import {
  Controller,
  Post,
  Body,
  Get,
  Put,
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
} from 'libs/dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationQueryDto } from 'libs/common';

@Controller()
export class GatewayController {
  constructor(private readonly httpService: HttpService) {}

  private async forward(
    method: 'get' | 'post' | 'put' | 'delete',
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
    } else if (path.startsWith('/admin')) {
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
  @ApiOperation({ summary: 'Generate a fresh dynamic virtual account on demand for deposits' })
  async refreshVirtualAccount(@CurrentUser() user: any) {
    return this.forward('post', '/wallets/me/virtual-account', null, null, user);
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

  @ApiTags('Admin — Audit Logs')
  @Get('admin/notifications')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Retrieve paginated system-wide notification log' })
  async getAllNotifications(@CurrentUser() user: any, @Query() query: PaginationQueryDto & { userId?: string }) {
    return this.forward('get', '/notifications', null, query, user);
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
  @ApiOperation({ summary: 'Public: List all states with their zones' })
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
  @Public()
  @Get('admin/pricing/calculate')
  @ApiOperation({ summary: 'Calculate pricing between zones or landmarks' })
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
}
