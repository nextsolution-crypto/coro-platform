import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { UserManualService } from './user-manual.service';

@Controller('user-manual')
@UseGuards(AuthGuard('jwt'))
export class UserManualInternalController {
  constructor(private readonly manual: UserManualService) {}
  @Get() list() {
    return this.manual.list('INTERNAL');
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.manual.get('INTERNAL', id);
  }
  @Post('ask') ask(@Body() body: { question?: unknown }) {
    return this.manual.ask('INTERNAL', body?.question);
  }
}
@Controller('client-portal/user-manual')
@UseGuards(ClientJwtGuard)
export class UserManualClientController {
  constructor(private readonly manual: UserManualService) {}
  @Get() list() {
    return this.manual.list('CLIENT');
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.manual.get('CLIENT', id);
  }
  @Post('ask') ask(@Body() body: { question?: unknown }) {
    return this.manual.ask('CLIENT', body?.question);
  }
}
