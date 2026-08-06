import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

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
