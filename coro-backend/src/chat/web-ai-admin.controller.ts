import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { WebAIObservabilityService } from './web-ai-observability.service';

@Controller('admin/v1/web-ai')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class WebAIAdminController {
  constructor(private readonly observability: WebAIObservabilityService) {}
  @Get('dashboard') dashboard() { return this.observability.dashboard(); }
}
