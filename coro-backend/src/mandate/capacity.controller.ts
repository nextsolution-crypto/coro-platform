import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CapacityService } from './capacity.service';

@Controller('admin/capacity')
@UseGuards(AuthGuard('jwt'))
export class CapacityController {
  constructor(private readonly service: CapacityService) {}

  @Get()
  getCapacity(@Request() req: any) {
    return this.service.getCapacityPlanning(req.user.organizationId);
  }
}