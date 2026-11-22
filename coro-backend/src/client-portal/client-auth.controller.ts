import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Put,
  Res,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  CLIENT_SESSION_COOKIE,
  clientSessionCookieOptions,
} from './client-session-cookie';
import { Throttle } from '@nestjs/throttler';
import { ClientAuthService } from './client-auth.service';
import { ClientJwtGuard } from './client-jwt.guard';

@Controller('client-auth')
export class ClientAuthController {
  constructor(private clientAuthService: ClientAuthService) {}

  /**
   * Pose la session dans un cookie httpOnly (M3-05). Le jeton reste dans la
   * réponse pendant la transition, mais le portail ne le stocke plus.
   */
  private withSessionCookie<T>(res: Response, result: T): T {
    const token = (result as any)?.token;
    if (typeof token === 'string' && token) {
      res.cookie(CLIENT_SESSION_COOKIE, token, clientSessionCookieOptions());
    }
    return result;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    const { maxAge: _maxAge, ...options } = clientSessionCookieOptions();
    res.clearCookie(CLIENT_SESSION_COOKIE, options);
    return { success: true };
  }

  @Get('me')
  @UseGuards(ClientJwtGuard)
  async me(@Request() req: any) {
    return this.clientAuthService.getCurrentUser(
      req.clientUser.sub,
      req.clientUser.organizationId,
    );
  }

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async login(
    @Body() body: { email: string; password: string; trustedToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.withSessionCookie(
      res,
      await this.clientAuthService.login(body.email, body.password, body.trustedToken),
    );
  }

  @Post('forgot-password')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    reset: { ttl: 900000, limit: 5 },
  })
  async forgotPassword(@Body() body: { email: string }) {
    return this.clientAuthService.forgotPassword(body?.email);
  }

  @Post('reset-password')
  @Throttle({
    short: { ttl: 60000, limit: 5 },
    reset: { ttl: 900000, limit: 15 },
  })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.clientAuthService.resetPassword(body?.token, body?.newPassword);
  }

  @Post('verify-mfa')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async verifyMfa(
    @Body() body: { email: string; code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.withSessionCookie(res, await this.clientAuthService.verifyMfa(body.email, body.code));
  }

  @Put('change-password')
  @UseGuards(ClientJwtGuard)
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  async changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.clientAuthService.changePassword(
      req.clientUser.sub,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('magic-link/validate')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async validateMagicLink(
    @Body() body: { token: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.withSessionCookie(res, await this.clientAuthService.validateMagicLink(body.token));
  }

  @Post('magic-link/request')
  @Throttle({
    short: { ttl: 60000, limit: 3 },
    reset: { ttl: 900000, limit: 5 },
  })
  async requestMagicLink(@Body() body: { email: string }) {
    return this.clientAuthService.requestMagicLink(body?.email);
  }
}
