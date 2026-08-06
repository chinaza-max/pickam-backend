import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { RiderStatus } from 'libs/constants';

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
