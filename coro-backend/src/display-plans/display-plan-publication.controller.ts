import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import type { SpatialActor } from '../spatial/spatial-authorization.service';
import {
  CreateDisplayPlanPublicationDto,
  DisplayPlanListQueryDto,
  DisplayPlanMutationDto,
  PublishDisplayPlanDto,
} from './dto/display-plan.dto';
import { DisplayPlanPublicationService } from './display-plan-publication.service';

type DisplayRequest = { user: SpatialActor };

@Controller(
  'organizations/:organizationId/buildings/:buildingId/display-plan-publications',
)
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class DisplayPlanPublicationController {
  constructor(private readonly plans: DisplayPlanPublicationService) {}

  @Post()
  create(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Body() dto: CreateDisplayPlanPublicationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.createDraft(org, building, dto, req.user);
  }

  @Get()
  list(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Query() query: DisplayPlanListQueryDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.list(org, building, query, req.user);
  }

  @Get('player-contract/:locationId')
  playerContract(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('locationId') location: string,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.playerContract(org, building, location, req.user);
  }

  @Get('player-contract/:locationId/variant/:publicationId')
  async playerVariant(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('locationId') location: string,
    @Param('publicationId') publication: string,
    @Request() req: DisplayRequest,
    @Res() res: Response,
  ) {
    const file = await this.plans.downloadPlayerVariant(
      org,
      building,
      location,
      publication,
      req.user,
    );
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('ETag', `"${file.sha256}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file.bytes);
  }

  @Get(':id')
  get(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.get(org, building, id, req.user);
  }

  @Get(':id/history')
  history(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.history(org, building, id, req.user);
  }

  @Get(':id/variant')
  async variant(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Request() req: DisplayRequest,
    @Res() res: Response,
  ) {
    const file = await this.plans.downloadVariant(org, building, id, req.user);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('ETag', `"${file.sha256}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(file.bytes);
  }

  @Post(':id/preview')
  preview(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.generatePreview(org, building, id, dto, req.user);
  }

  @Post(':id/submit')
  submit(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.submit(org, building, id, dto, req.user);
  }

  @Post(':id/review')
  review(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.markReviewed(org, building, id, dto, req.user);
  }

  @Post(':id/reject')
  reject(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.reject(org, building, id, dto, req.user);
  }

  @Post(':id/approve')
  approve(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.approve(org, building, id, dto, req.user);
  }

  @Post(':id/publish')
  publish(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: PublishDisplayPlanDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.publish(org, building, id, dto, req.user);
  }

  @Post(':id/suspend')
  suspend(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.suspend(org, building, id, dto, req.user);
  }

  @Post(':id/resume')
  resume(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.resume(org, building, id, dto, req.user);
  }

  @Post(':id/revoke')
  revoke(
    @Param('organizationId') org: string,
    @Param('buildingId') building: string,
    @Param('id') id: string,
    @Body() dto: DisplayPlanMutationDto,
    @Request() req: DisplayRequest,
  ) {
    return this.plans.revoke(org, building, id, dto, req.user);
  }
}
