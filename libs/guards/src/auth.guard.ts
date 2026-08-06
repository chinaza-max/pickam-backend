import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from 'libs/decorators';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 1. Gateway Forwarding validation
    const forwardedUserId = request.headers['x-user-id'];
    if (forwardedUserId) {
      request.user = {
        id: forwardedUserId,
        email: request.headers['x-user-email'],
        role: request.headers['x-user-role'],
      };
      return true;
    }

    // 2. Token validation (for Gateway or direct microservice queries)
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization format');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret:
          process.env.JWT_SECRET ||
          'pickam_super_secret_jwt_key_for_development_and_mvp',
      });
      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
