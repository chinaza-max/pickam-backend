import { Type, plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT = 3000;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION = '24h';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  USER_SERVICE_PORT = 3001;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  WALLET_SERVICE_PORT = 3002;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ORDER_SERVICE_PORT = 3003;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  NOTIFICATION_SERVICE_PORT = 3004;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  ADMIN_SERVICE_PORT = 3005;

  @IsString()
  @IsOptional()
  SAFEHAVEN_ENVIRONMENT?: string;

  @IsString()
  SAFEHAVEN_CLIENT_ID: string;

  @IsString()
  SAFEHAVEN_CLIENT_ASSERTION: string;

  @IsString()
  @IsOptional()
  SAFEHAVEN_CLIENT_ASSERTION_TYPE?: string;

  @IsString()
  @IsOptional()
  SAFEHAVEN_BANK_CODE?: string;

  @IsString()
  SAFEHAVEN_ACCOUNT_NUMBER: string;

  @IsString()
  @IsOptional()
  SAFEHAVEN_CALLBACK_URL?: string;

  @IsString()
  @IsOptional()
  SAFEHAVEN_WEBHOOK_SECRET?: string;
}

export function validate(config: Record<string, any>) {
  const convertedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(convertedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return convertedConfig;
}
