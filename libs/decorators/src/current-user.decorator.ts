import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Support local passport user validation and API Gateway header forwarding
    const user = request.user || {
      id: request.headers['x-user-id'],
      email: request.headers['x-user-email'],
      role: request.headers['x-user-role'],
    };

    return data ? user?.[data] : user;
  },
);
