import { Controller, Post, Body, UseGuards, Request, Put } from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtGuard } from './client-jwt.guard';

@Controller('client-auth')
export class ClientAuthController {
  constructor(private clientAuthService: ClientAuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.clientAuthService.login(body.email, body.password);
  }

  @Put('change-password')
  @UseGuards(ClientJwtGuard)
  async changePassword(
    @Request() req: any,
    @Body() body: { newPassword: string },
  ) {
    return this.clientAuthService.changePassword(req.clientUser.sub, body.newPassword);
  }

  @Post('magic-link/validate')
  async validateMagicLink(@Body() body: { token: string }) {
    return this.clientAuthService.validateMagicLink(body.token);
  }
}