import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MandateService } from './mandate.service';

@Controller('rendement')
@UseGuards(AuthGuard('jwt'))
export class RendementController {
  constructor(private readonly service: MandateService) {}

  @Get()
  getRendement(
    @Query('userId') userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Request() req: any,
  ) {
    return this.service.getRendement(req.user.organizationId, userId || undefined, from, to);
  }
}