import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwt.sign(
      { sub: admin.id, email: admin.email, name: admin.name, role: admin.role, type: 'ADMIN' },
      { secret: this.config.get<string>('ADMIN_JWT_SECRET'), expiresIn: '12h' },
    );

    return { token, admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role } };
  }
}
