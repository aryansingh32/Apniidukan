import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ADMIN_ROLES_KEY } from '../decorators/admin-roles.decorator';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private config: ConfigService, private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.authorization;
    const [type, token] = header ? header.split(' ') : [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Missing bearer token');

    try {
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.get<string>('ADMIN_JWT_SECRET') });
      if (payload.role === undefined || payload.type !== 'ADMIN') throw new UnauthorizedException();
      request.admin = payload;

      const allowedRoles = this.reflector.getAllAndOverride<string[]>(ADMIN_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(payload.role)) {
        throw new UnauthorizedException('Insufficient admin role');
      }

      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid or expired admin token');
    }
  }
}
