import { Controller, Get, Post, Put, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  private assertAdmin(req: any) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
  }

  @Get('organization')
  @UseGuards(AuthGuard('jwt'))
  async getOrganizationUsers(@Request() req: any) {
    return this.usersService.findByOrganization(req.user.organizationId);
  }

  @Post('organization')
  @UseGuards(AuthGuard('jwt'))
  async createOrganizationUser(@Body() body: any, @Request() req: any) {
    this.assertAdmin(req);
    return this.usersService.createInOrganization(req.user.organizationId, body);
  }

  @Put('organization/:id/active')
  @UseGuards(AuthGuard('jwt'))
  async toggleOrganizationUserActive(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @Request() req: any,
  ) {
    this.assertAdmin(req);
    return this.usersService.toggleActiveInOrganization(id, req.user.organizationId, body.isActive);
  }

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

  @Put('me/password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Request() req: any, @Body() body: { newPassword: string }) {
    if (!body.newPassword || body.newPassword.length < 8) {
      throw new ForbiddenException('Le mot de passe doit contenir au moins 8 caractères.');
    }
    return this.usersService.changePassword(req.user.userId, body.newPassword);
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