import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateStateDto {
  @ApiProperty({ example: 'Enugu' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'EN', description: 'Short state code e.g. LA, EN, AB' })
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

export class PricingCalculateQuery {
  @IsString()
  @IsNotEmpty()
  fromLandmarkId: string;

  @IsString()
  @IsNotEmpty()
  toLandmarkId: string;
}

export {
  GetStateByCoordinatesDto,
  GetZonesByStateDto,
  GetLandmarksByZoneDto,
} from 'libs/dto';

