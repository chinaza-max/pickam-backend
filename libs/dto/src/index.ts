import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsNumber, IsNotEmpty, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, OrderStatus, RiderStatus, AdminPrivilege, AdminRole } from 'libs/constants';


// ==========================================
// USER SERVICE DTOs
// ==========================================
export class RegisterDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({ example: 'BIKE', required: false })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiProperty({ example: 'LA-123-ABC', required: false })
  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @ApiProperty({ example: 'LIC-998877', required: false })
  @IsString()
  @IsOptional()
  licenseNo?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  password: string;
}

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

export class UpdateRiderProfileDto {
  @ApiProperty({ example: 'BIKE', required: false })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiProperty({ example: 'LA-123-ABC', required: false })
  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @ApiProperty({ example: 'LIC-998877', required: false })
  @IsString()
  @IsOptional()
  licenseNo?: string;

  @ApiProperty({ enum: RiderStatus, example: RiderStatus.ONLINE, required: false })
  @IsEnum(RiderStatus)
  @IsOptional()
  status?: RiderStatus;
}

export class SocialLoginDto {
  @ApiProperty({ example: 'GOOGLE', description: 'Social auth provider: GOOGLE or APPLE' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: '1122334455667788', description: 'Raw unique provider ID' })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  @IsEnum(UserRole)
  role: UserRole;
}

export class LinkSocialDto {
  @ApiProperty({ example: 'GOOGLE', description: 'Social provider to link: GOOGLE or APPLE' })
  @IsString()
  @IsNotEmpty()
  provider: string;

  @ApiProperty({ example: '1122334455667788', description: 'Raw unique provider ID to link' })
  @IsString()
  @IsNotEmpty()
  providerId: string;
}

export class AddPasswordDto {
  @ApiProperty({ example: 'Password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ example: 'NewPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}

export class AdminUpdateUserDto {
  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ enum: AdminPrivilege, isArray: true, example: [AdminPrivilege.USER_MANAGEMENT, AdminPrivilege.OPERATIONS], required: false })
  @IsArray()
  @IsEnum(AdminPrivilege, { each: true })
  @IsOptional()
  privileges?: AdminPrivilege[];

  @ApiProperty({ example: 'ACTIVE', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isVerified?: boolean;

  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '+2348011223344', required: false })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

// ==========================================
// ORDER SERVICE DTOs
// ==========================================
export class CreateOrderDto {
  @ApiProperty({ example: '123 Pickup St, Ikeja' })
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @ApiProperty({ example: '456 Destination Ave, Ikeja' })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;

  @ApiProperty({ example: 'landmark-uuid-1111' })
  @IsString()
  @IsNotEmpty()
  pickupLandmarkId: string;

  @ApiProperty({ example: 'landmark-uuid-2222' })
  @IsString()
  @IsNotEmpty()
  destinationLandmarkId: string;

  @ApiProperty({ example: 'Amaka Johnson', required: false })
  @IsString()
  @IsOptional()
  recipientName?: string;

  @ApiProperty({ example: '+2348012345678', required: false })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiProperty({ example: 'Leave at the gate', required: false })
  @IsString()
  @IsOptional()
  pickupNotes?: string;

  @ApiProperty({ example: 'Call before delivery', required: false })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;

  @ApiProperty({ example: 30, description: 'Minutes before the order expires if not assigned', required: false })
  @IsNumber()
  @IsOptional()
  expiresInMinutes?: number;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PICKED_UP })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class AssignRiderDto {
  @ApiProperty({ example: 'rider-uuid-12345' })
  @IsString()
  riderId: string;
}

// ==========================================
// ADMIN SERVICE DTOs
// ==========================================
export class CreateStateDto {
  @ApiProperty({ example: 'Enugu' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'EN', description: 'Short state code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'ACTIVE', required: false })
  @IsString()
  @IsOptional()
  status? = 'ACTIVE';
}

export class CreateZoneDto {
  @ApiProperty({ example: 'New Haven' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'state-uuid-1234', required: false, description: 'State this zone belongs to' })
  @IsString()
  @IsOptional()
  stateId?: string;

  @ApiProperty({ example: 800 })
  @IsNumber()
  basePrice: number;

  @ApiProperty({ example: 'ACTIVE', required: false })
  @IsString()
  @IsOptional()
  status? = 'ACTIVE';
}

export class CreateLandmarkDto {
  @ApiProperty({ example: 'UNEC Gate' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'zone-uuid-1234' })
  @IsString()
  @IsNotEmpty()
  zoneId: string;
}

export class CreatePricingMatrixDto {
  @ApiProperty({ example: 'zone-uuid-1111' })
  @IsString()
  @IsNotEmpty()
  fromZoneId: string;

  @ApiProperty({ example: 'zone-uuid-2222' })
  @IsString()
  @IsNotEmpty()
  toZoneId: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 'ACTIVE', required: false })
  @IsString()
  @IsOptional()
  status? = 'ACTIVE';
}

// ==========================================
// USER LOCATION & GEOCODING DTOs
// ==========================================
export class GetStateByCoordinatesDto {
  @ApiProperty({ example: 6.5244, required: false, description: 'Latitude coordinate' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: 3.3792, required: false, description: 'Longitude coordinate' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ example: 6.5244, required: false, description: 'Alternative field for latitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lat?: number;

  @ApiProperty({ example: 3.3792, required: false, description: 'Alternative field for longitude' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lng?: number;

  @ApiProperty({ example: 3.3792, required: false, description: 'Alternative field for longitude (lon)' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  lon?: number;
}

export class GetZonesByStateDto {
  @ApiProperty({ example: 'state-uuid-1234', required: false, description: 'State UUID in database' })
  @IsString()
  @IsOptional()
  stateId?: string;

  @ApiProperty({ example: 'Lagos', required: false, description: 'State Name (e.g. Lagos, Enugu) or ISO Code (e.g. LA)' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ example: 'Lagos', required: false, description: 'Alternative field for State Name' })
  @IsString()
  @IsOptional()
  stateName?: string;
}

export class GetLandmarksByZoneDto {
  @ApiProperty({ example: 'zone-uuid-1234', required: false, description: 'Zone UUID in database' })
  @IsString()
  @IsOptional()
  zoneId?: string;

  @ApiProperty({ example: 'Ikeja', required: false, description: 'Zone Name (e.g. Ikeja, New Haven)' })
  @IsString()
  @IsOptional()
  zone?: string;

  @ApiProperty({ example: 'Ikeja', required: false, description: 'Alternative field for Zone Name' })
  @IsString()
  @IsOptional()
  zoneName?: string;
}

export class FundWalletDto {
  @ApiProperty({ example: 10000, required: false, description: 'Amount to fund in NGN (default: 10000)' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ example: 15, required: false, description: 'Delay in seconds before crediting (default: 15)' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  delaySeconds?: number;
}


