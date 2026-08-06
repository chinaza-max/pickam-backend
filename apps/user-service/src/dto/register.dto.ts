import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from 'libs/constants';

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

  // Rider specific fields (optional during base registration)
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
