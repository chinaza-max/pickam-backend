import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'createdAt' })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ enum: OrderDirection, default: OrderDirection.DESC })
  @IsOptional()
  @IsEnum(OrderDirection)
  order?: OrderDirection = OrderDirection.DESC;

  // Generic filters
  @ApiPropertyOptional({ example: 'CUSTOMER' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  verified?: string;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  // Additional generic filter fields
  @ApiPropertyOptional({ example: 'zone-id-123' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ example: 'lm_isale_eko_001' })
  @IsOptional()
  @IsString()
  landmarkId?: string;

  @ApiPropertyOptional({ example: 'DEBIT' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: 'SUCCESS' })
  @IsOptional()
  @IsString()
  paymentStatus?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}
