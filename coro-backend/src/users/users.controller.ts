import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  async updateMe(@Request() req: any, @Body() body: any) {
    return this.usersService.updateUser(req.user.userId, body);
  }

  @Put('me/logo')
  @UseGuards(AuthGuard('jwt'))
  async updateLogo(@Request() req: any, @Body() body: { companyLogoB64: string }) {
    return this.usersService.updateUser(req.user.userId, { companyLogoB64: body.companyLogoB64 });
  }

  @Put('me/logo-full')
  @UseGuards(AuthGuard('jwt'))
  async updateLogoFull(@Request() req: any, @Body() body: { companyLogoFullB64: string }) {
    return this.usersService.updateUser(req.user.userId, { companyLogoFullB64: body.companyLogoFullB64 });
  }
}