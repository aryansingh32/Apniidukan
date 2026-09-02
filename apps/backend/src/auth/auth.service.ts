import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const OTP_TTL_MINUTES = 5;
const DEMO_OTP_CODE = '123456';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService, private config: ConfigService) {}

  async requestOtp(mobileNumber: string) {
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
      throw new BadRequestException('Enter a valid 10-digit Indian mobile number');
    }

    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await this.prisma.otpRequest.create({
      data: { mobileNumber, code: DEMO_OTP_CODE, expiresAt },
    });

    return {
      message: 'OTP sent successfully',
      devNote: 'Demo environment: use 123456 as the OTP',
      expiresInSeconds: OTP_TTL_MINUTES * 60,
    };
  }

  async verifyOtp(mobileNumber: string, code: string) {
    const otp = await this.prisma.otpRequest.findFirst({
      where: { mobileNumber, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp || otp.expiresAt < new Date() || otp.code !== code) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.otpRequest.update({ where: { id: otp.id }, data: { consumed: true } });

    let retailer = await this.prisma.retailer.findUnique({ where: { mobileNumber } });
    let isNewRetailer = false;
    if (!retailer) {
      retailer = await this.prisma.retailer.create({ data: { mobileNumber } });
      isNewRetailer = true;
    }

    const token = this.jwt.sign(
      { sub: retailer.id, mobileNumber: retailer.mobileNumber, role: 'RETAILER' },
      { secret: this.config.get<string>('JWT_SECRET'), expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') ?? '30d') as any },
    );

    return { token, retailer, isNewRetailer, needsRegistration: !retailer.shopName };
  }
}
