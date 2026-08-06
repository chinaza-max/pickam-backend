import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from 'libs/constants';

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
