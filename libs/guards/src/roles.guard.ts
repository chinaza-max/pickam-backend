import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'libs/decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user || {
      id: request.headers['x-user-id'],
      email: request.headers['x-user-email'],
      role: request.headers['x-user-role'],
    };

    if (!user || !user.role) {
      throw new ForbiddenException('No user role found on request context');
    }

    const adminRoles = ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'];
    const hasRole =
      requiredRoles.includes(user.role) ||
      (requiredRoles.includes('ADMIN') && adminRoles.includes(user.role));
    if (!hasRole) {
      throw new ForbiddenException(
        `Required role [${requiredRoles.join(', ')}] not matched. Current: ${user.role}`,
      );
    }

    return true;
  }
}
