import { IsEmail, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address to send OTP to' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    example: 'EMAIL_VERIFICATION',
    description: 'OTP purpose',
    enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET'],
  })
  @IsOptional()
  @IsIn(['EMAIL_VERIFICATION', 'PASSWORD_RESET'])
  purpose?: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '482931', description: '6-digit OTP code' })
  @IsNotEmpty()
  otp: string;

  @ApiPropertyOptional({
    example: 'EMAIL_VERIFICATION',
    enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET'],
  })
  @IsOptional()
  @IsIn(['EMAIL_VERIFICATION', 'PASSWORD_RESET'])
  purpose?: string;
}


export class ResetPasswordDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "482931", description: "6-digit OTP code" })
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: "NewSecretPass123" })
  @IsNotEmpty()
  newPassword: string;
}
