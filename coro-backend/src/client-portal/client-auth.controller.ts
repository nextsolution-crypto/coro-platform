import { Controller, Post, Body, UseGuards, Request, Put } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtGuard } from './client-jwt.guard';

@Controller('client-auth')
export class ClientAuthController {
  constructor(private clientAuthService: ClientAuthService) {}

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async login(@Body() body: { email: string; password: string }) {
    return this.clientAuthService.login(body.email, body.password);
  }

  @Put('change-password')
  @UseGuards(ClientJwtGuard)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  async changePassword(
    @Request() req: any,
    @Body() body: { newPassword: string },
  ) {
    return this.clientAuthService.changePassword(req.clientUser.sub, body.newPassword);
  }

  @Post('magic-link/validate')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async validateMagicLink(@Body() body: { token: string }) {
    return this.clientAuthService.validateMagicLink(body.token);
  }
}