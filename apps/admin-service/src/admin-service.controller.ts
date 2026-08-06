import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AdminServiceService } from './admin-service.service';
import {
  CreateStateDto,
  CreateZoneDto,
  CreateLandmarkDto,
  CreatePricingMatrixDto,
} from './dto/admin.dto';
import { AuthGuard, RolesGuard } from 'libs/guards';
import { Public, Roles } from 'libs/decorators';
import { UserRole } from 'libs/constants';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaginationQueryDto } from 'libs/common';

@ApiTags('Admin Panel')
@Controller('admin')
export class AdminServiceController {
  constructor(private readonly adminService: AdminServiceService) {}

  // ==========================================
  // STATE ENDPOINTS
  // ==========================================
  @Public()
  @Get('states/nigeria')
  @ApiOperation({ summary: 'Fetch all 36 Nigerian states + FCT via country-state-city package' })
  async getNigeriaStates() {
    return this.adminService.getNigeriaStates();
  }

  @Post('states/seed-nigeria')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk seed all 36 Nigerian states + FCT into database (Admin only)' })
  async seedNigeriaStates() {
    return this.adminService.seedNigeriaStates();
  }

  @Post('states')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a state (Admin only)' })
  async createState(@Body() dto: CreateStateDto) {
    return this.adminService.createState(dto);
  }

  @Put('states/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a state (Admin only)' })
  async updateState(@Param('id') id: string, @Body() dto: Partial<CreateStateDto>) {
    return this.adminService.updateState(id, dto);
  }

  @Get('states')
  @Public()
  @ApiOperation({ summary: 'List all states (with their zones)' })
  async listStates(@Query() query: PaginationQueryDto) {
    return this.adminService.listStates(query);
  }

  // ==========================================
  // ZONE ENDPOINTS
  // ==========================================
  @Post('zones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a delivery zone (Admin only)' })
  async createZone(@Body() dto: CreateZoneDto) {
    return this.adminService.createZone(dto);
  }

  @Put('zones/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a delivery zone (Admin only)' })
  async updateZone(@Param('id') id: string, @Body() dto: Partial<CreateZoneDto>) {
    return this.adminService.updateZone(id, dto);
  }

  @Get('zones')
  @Public()
  @ApiOperation({ summary: 'List all delivery zones (filter by stateId)' })
  async listZones(@Query() query: PaginationQueryDto & { stateId?: string }) {
    return this.adminService.listZones(query);
  }

  @Post('landmarks')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a landmark within a zone (Admin only)' })
  async createLandmark(@Body() dto: CreateLandmarkDto) {
    return this.adminService.createLandmark(dto);
  }

  @Get('landmarks')
  @Public()
  @ApiOperation({ summary: 'List all landmarks' })
  async listLandmarks(@Query() query: PaginationQueryDto) {
    return this.adminService.listLandmarks(query);
  }

  @Post('pricing')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Define pricing matrix between zones (Admin only)' })
  async createPricingMatrix(@Body() dto: CreatePricingMatrixDto) {
    return this.adminService.createPricingMatrix(dto);
  }

  @Put('pricing/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a pricing matrix entry (Admin only)' })
  async updatePricingMatrix(@Param('id') id: string, @Body() dto: Partial<CreatePricingMatrixDto>) {
    return this.adminService.updatePricingMatrix(id, dto);
  }

  @Get('pricing')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all pricing matrices — includes zone names (Admin only)' })
  async listPricing(@Query() query: PaginationQueryDto) {
    return this.adminService.listPricingMatrices(query);
  }

  @Get('pricing/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single pricing matrix by ID (Admin only)' })
  async getPricingMatrix(@Param('id') id: string) {
    return this.adminService.getPricingMatrix(id);
  }

  @Delete('pricing/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a pricing matrix entry (Admin only)' })
  async deletePricingMatrix(@Param('id') id: string) {
    return this.adminService.deletePricingMatrix(id);
  }

  @Public()
  @Get('pricing/calculate')
  @ApiOperation({ summary: 'Calculate pricing between two landmarks (Public / Internal)' })
  async calculatePrice(
    @Query('fromLandmarkId') fromLandmarkId: string,
    @Query('toLandmarkId') toLandmarkId: string,
  ) {
    if (!fromLandmarkId || !toLandmarkId) {
      throw new BadRequestException('fromLandmarkId and toLandmarkId are required query parameters');
    }
    return this.adminService.calculateDeliveryPrice(fromLandmarkId, toLandmarkId);
  }

  @Get('dashboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin dashboard analytics (Admin only)' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/revenue-chart')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revenue breakdown for the last 14 days — daily chart data (Admin only)' })
  async getRevenueChart() {
    return this.adminService.getRevenueChart();
  }

  @Get('dashboard/recent-orders')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Most recent 10 orders across the platform (Admin only)' })
  async getRecentOrders() {
    return this.adminService.getRecentOrders();
  }
}
