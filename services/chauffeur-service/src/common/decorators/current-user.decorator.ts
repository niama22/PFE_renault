import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  keycloakId: string;
  username: string;
  email: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
