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
} from '@nestjs/common';
import { UserServiceService } from './user-service.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRiderProfileDto } from './dto/rider-profile.dto';
import { SendOtpDto, VerifyOtpDto, ResetPasswordDto } from './dto/otp.dto';
import { AuthGuard, RolesGuard } from 'libs/guards';
import { CurrentUser, Public, Roles } from 'libs/decorators';
import { UserRole } from 'libs/constants';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SocialLoginDto, LinkSocialDto, AddPasswordDto, ChangePasswordDto, AdminUpdateUserDto } from 'libs/dto';
import { PaginationQueryDto } from 'libs/common';

@ApiTags('Users & Auth')
@Controller()
export class UserServiceController {
  constructor(private readonly userService: UserServiceService) {}

  @Public()
  @Post('auth/register')
  @ApiOperation({ summary: 'Register a new customer, rider, or admin' })
  async register(@Body() dto: RegisterDto) {
    return this.userService.register(dto);
  }

  @Public()
  @Post('auth/login')
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(@Body() dto: LoginDto) {
    return this.userService.login(dto);
  }

  @Public()
  @Post('auth/social-login')
  @ApiOperation({ summary: 'Authenticate or register via Google/Apple social login' })
  async socialLogin(@Body() dto: SocialLoginDto) {
    return this.userService.socialLogin(dto);
  }

  @Public()
  @Post('auth/send-otp')
  @ApiOperation({ summary: 'Send a 6-digit OTP to an email address for verification or password reset' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.userService.sendOtp(dto);
  }

  @Public()
  @Post('auth/verify-otp')
  @ApiOperation({ summary: 'Verify a 6-digit OTP code sent to an email address' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.userService.verifyOtp(dto);
  }

  @Public()
  @Post("auth/forgot-password")
  @ApiOperation({ summary: "Request password reset OTP" })
  async forgotPassword(@Body() dto: SendOtpDto) {
    return this.userService.sendOtp({ email: dto.email, purpose: "PASSWORD_RESET" });
  }

  @Public()
  @Post("auth/reset-password")
  @ApiOperation({ summary: "Reset password using verified OTP" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(dto);
  }


  @Get('profiles/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile details of current user' })
  async getProfile(@CurrentUser('id') id: string) {
    return this.userService.getProfile(id);
  }

  @Put('profiles/me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update profile details of current user' })
  async updateProfile(
    @CurrentUser('id') id: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(id, dto);
  }

  @Post('profiles/link-social')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a new Google or Apple social account' })
  async linkSocial(
    @CurrentUser('id') id: string,
    @Body() dto: LinkSocialDto,
  ) {
    return this.userService.linkSocialAccount(id, dto);
  }

  @Post('profiles/add-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set password for a social-only registered account' })
  async addPassword(
    @CurrentUser('id') id: string,
    @Body() dto: AddPasswordDto,
  ) {
    return this.userService.addPassword(id, dto);
  }

  @Post('profiles/change-password')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(id, dto);
  }

  @Put('riders/profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider profile details (Riders only)' })
  async updateRiderProfile(
    @CurrentUser('id') id: string,
    @Body() dto: UpdateRiderProfileDto,
  ) {
    return this.userService.updateRiderProfile(id, dto);
  }

  // Internal endpoints for other services
  @Get('users/:id')
  @Public()
  @ApiOperation({ summary: 'Internal: retrieve user by ID' })
  async findUserById(@Param('id') id: string) {
    return this.userService.findUserById(id);
  }

  @Get('riders')
  @Public()
  @ApiOperation({ summary: 'Internal/Admin: list all riders' })
  async findAllRiders(@Query() query: PaginationQueryDto) {
    return this.userService.findAllRiders(query);
  }

  @Post('riders/:userId/zones')
  @Public()
  @ApiOperation({ summary: 'Internal/Admin: Assign rider to operating zones' })
  async assignRiderToZones(
    @Param('userId') userId: string,
    @Body('zoneIds') zoneIds: string[],
  ) {
    return this.userService.assignRiderToZones(userId, zoneIds);
  }

  @Get('riders/:userId/zones')
  @Public()
  @ApiOperation({ summary: 'Internal/Admin: Get rider operating zones' })
  async getRiderZones(@Param('userId') userId: string) {
    return this.userService.getRiderZones(userId);
  }

  // ==========================================
  // ADMIN USER MANAGEMENT ENDPOINTS
  // ==========================================
  @Get('admin/users')
  @Public() // Gatekeepers on API Gateway enforce actual Roles, but User Service needs these accessible
  @ApiOperation({ summary: 'Admin: Retrieve paginated, filterable, and searchable list of users' })
  async listUsers(@Query() query: PaginationQueryDto) {
    return this.userService.listUsers(query);
  }

  @Get('admin/users/:id')
  @Public()
  @ApiOperation({ summary: 'Admin: Retrieve full user profile & associated details' })
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Put('admin/users/:id')
  @Public()
  @ApiOperation({ summary: 'Admin: Update user role, status, and profile information' })
  async updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.userService.updateUser(id, dto);
  }

  @Post('admin/users/:id/suspend')
  @Public()
  @ApiOperation({ summary: 'Admin: Suspend a user account' })
  async suspendUser(@Param('id') id: string) {
    return this.userService.suspendUser(id);
  }

  @Post('admin/users/:id/activate')
  @Public()
  @ApiOperation({ summary: 'Admin: Activate a suspended user account' })
  async activateUser(@Param('id') id: string) {
    return this.userService.activateUser(id);
  }

  @Delete('admin/users/:id')
  @Public()
  @ApiOperation({ summary: 'Admin: Soft delete a user account' })
  async softDeleteUser(@Param('id') id: string) {
    return this.userService.softDeleteUser(id);
  }

  @Get('admin/users/:id/wallet')
  @Public()
  @ApiOperation({ summary: 'Admin: View a user\'s wallet balance and virtual account detail' })
  async viewUserWallet(@Param('id') id: string) {
    return this.userService.viewUserWallet(id);
  }

  @Get('admin/users/:id/orders')
  @Public()
  @ApiOperation({ summary: 'Admin: View a user\'s order history log' })
  async viewUserOrders(@Param('id') id: string, @Query() query: PaginationQueryDto) {
    return this.userService.viewUserOrders(id, query);
  }
}
