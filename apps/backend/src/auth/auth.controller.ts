import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth/mobile')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('request-otp')
  requestOtp(@Body('mobileNumber') mobileNumber: string) {
    return this.authService.requestOtp(mobileNumber);
  }

  @Post('verify-otp')
  verifyOtp(@Body('mobileNumber') mobileNumber: string, @Body('code') code: string) {
    return this.authService.verifyOtp(mobileNumber, code);
  }
}
