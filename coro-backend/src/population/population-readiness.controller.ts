import {
  Controller,
  ForbiddenException,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PopulationReadinessService } from './population-readiness.service';

@Controller('internal/readiness/population')
@UseGuards(AuthGuard('jwt'))
export class PopulationReadinessController {
  constructor(private readonly readiness: PopulationReadinessService) {}

  @Get()
  getReadiness(@Request() request: any) {
    if (request.user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
    return this.readiness.getReadiness();
  }
}
