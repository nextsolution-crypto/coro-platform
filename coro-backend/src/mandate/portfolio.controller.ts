import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MandateService } from './mandate.service';

@Controller('admin/portfolio')
@UseGuards(AuthGuard('jwt'))
export class PortfolioController {
  constructor(private readonly service: MandateService) {}

  @Get()
  getPortfolio(@Request() req: any) {
    return this.service.getPortfolio(req.user.organizationId);
  }
}