import { Controller, Post, Body, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  applySessionCookies,
  clearSessionCookies,
  readRefreshCookie,
} from './advisor-session-cookie';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async login(
    @Body() body: { email: string; password: string; trustedToken?: string },
    @Res({ passthrough: true }) res: any,
  ) {
    return applySessionCookies(
      res,
      await this.authService.login(body.email, body.password, body.trustedToken),
    );
  }

  @Post('forgot-password')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  @Throttle({ short: { ttl: 60000, limit: 3 } })
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }

  @Post('verify-mfa')
  @Throttle({ short: { ttl: 60000, limit: 5 } })
  async verifyMfa(
    @Body() body: { email: string; code: string },
    @Res({ passthrough: true }) res: any,
  ) {
    return applySessionCookies(res, await this.authService.verifyMfa(body.email, body.code));
  }

  @Post('refresh')
  @Throttle({ short: { ttl: 60000, limit: 10 } })
  async refresh(
    @Body() body: { refresh_token?: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = readRefreshCookie(req) || body?.refresh_token;
    if (!token) throw new UnauthorizedException('Refresh token invalide ou expiré.');
    try {
      return applySessionCookies(res, await this.authService.refreshAccessToken(token));
    } catch (error) {
      clearSessionCookies(res);
      throw error;
    }
  }

  @Post('logout')
  async logout(
    @Body() body: { refresh_token?: string },
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = readRefreshCookie(req) || body?.refresh_token;
    clearSessionCookies(res);
    if (!token) return { success: true };
    return this.authService.revokeRefreshToken(token);
  }
}
