import { Controller, ForbiddenException, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CapacityService } from './capacity.service';

@Controller('admin/capacity')
@UseGuards(AuthGuard('jwt'))
export class CapacityController {
  constructor(private readonly service: CapacityService) {}

  @Get()
  getCapacity(@Request() req: any) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(req.user?.role)) throw new ForbiddenException('Accès interdit');
    return this.service.getCapacityPlanning(req.user.organizationId);
  }
}
