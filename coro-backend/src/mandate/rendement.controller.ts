import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MandateService } from './mandate.service';
import { requireInternal } from '../auth/work-management-access';

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
    requireInternal(req.user);
    const effectiveUserId = ['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)
      ? userId || undefined
      : req.user.userId;
    return this.service.getRendement(req.user.organizationId, effectiveUserId, from, to);
  }
}
