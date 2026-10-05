import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CommercialConfigurationService } from './commercial-configuration.service';
import {
  GovernedPublishDto,
  GovernedReasonDto,
} from './commercial-configuration.dto';

type AuthenticatedRequest = { user: { userId: string } };
@Controller('admin/v1/commercial/configurations')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialConfigurationController {
  constructor(private readonly service: CommercialConfigurationService) {}
  @Get() list() {
    return this.service.listDefinitions();
  }
  @Get(':definition/analyze') analyze(@Param('definition') definition: string) {
    return this.service.analyze(definition);
  }
  @Get(':definition/review') review(@Param('definition') definition: string) {
    return this.service.review(definition);
  }
  @Post(':definition/apply') apply(
    @Param('definition') definition: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.apply(definition, req.user);
  }
  @Post(':definition/approve') approve(
    @Param('definition') definition: string,
    @Body() dto: GovernedReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.approve(definition, dto.reason, req.user);
  }
  @Post(':definition/publish') publish(
    @Param('definition') definition: string,
    @Body() dto: GovernedPublishDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.publish(
      definition,
      dto.effectiveFrom,
      dto.reason,
      req.user,
    );
  }
}
