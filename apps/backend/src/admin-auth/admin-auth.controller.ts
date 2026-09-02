import { Body, Controller, Post } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private service: AdminAuthService) {}

  @Post('login')
  login(@Body('email') email: string, @Body('password') password: string) {
    return this.service.login(email, password);
  }
}
