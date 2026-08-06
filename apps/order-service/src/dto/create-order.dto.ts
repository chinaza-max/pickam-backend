import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: '32 Broad Street, Lagos Island' })
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @ApiProperty({ example: '14 Admiralty Way, Lekki Phase 1' })
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

  @ApiProperty({ example: '+2348011223344', required: false })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiProperty({ example: 'Call when you arrive', required: false })
  @IsString()
  @IsOptional()
  pickupNotes?: string;

  @ApiProperty({ example: 'Leave at the gate. Do not give to anyone else.', required: false })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;

  @ApiProperty({
    example: 30,
    description: 'Minutes until order expires if not assigned to a rider (defaults to 60)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  expiresInMinutes?: number;
}
