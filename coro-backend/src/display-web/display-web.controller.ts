import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
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
import { DisplayWebService } from './display-web.service';
import {
  ActivateWebDisplayDto,
  ConfirmWebDisplayDto,
  CreateWebActivationDto,
  RevokeWebSessionDto,
} from './dto/display-web.dto';

@Controller('display-public')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class DisplayWebPublicController {
  constructor(private readonly web: DisplayWebService) {}

  @Get('d/:publicDisplayId')
  status(@Param('publicDisplayId') id: string) {
    return this.web.publicStatus(id);
  }

  @Post('d/:publicDisplayId/activate')
  activate(
    @Param('publicDisplayId') id: string,
    @Body() dto: ActivateWebDisplayDto,
  ) {
    return this.web.activate(id, dto);
  }

  @Get('d/:publicDisplayId/manifest')
  manifest(
    @Param('publicDisplayId') id: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.web.manifest(id, auth);
  }

  @Get('d/:publicDisplayId/content/:publicationId')
  async content(
    @Param('publicDisplayId') id: string,
    @Param('publicationId') publicationId: string,
    @Headers('authorization') auth: string | undefined,
    @Res() response: Response,
  ) {
    const file = await this.web.content(id, publicationId, auth);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('ETag', `"${file.sha256}"`);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; sandbox",
    );
    response.send(file.bytes);
  }

  @Post('d/:publicDisplayId/confirm')
  confirm(
    @Param('publicDisplayId') id: string,
    @Headers('authorization') auth: string | undefined,
    @Body() dto: ConfirmWebDisplayDto,
  ) {
    return this.web.confirm(id, auth, dto);
  }
}

@Controller('organizations/:organizationId/display-web')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class DisplayWebAdministrationController {
  constructor(private readonly web: DisplayWebService) {}

  @Post('locations/:locationId/activations')
  activation(
    @Param('organizationId') organizationId: string,
    @Param('locationId') locationId: string,
    @Request() request: { user: SpatialActor },
    @Body() dto: CreateWebActivationDto,
  ) {
    return this.web.createActivation(
      organizationId,
      locationId,
      request.user,
      dto,
    );
  }

  @Post('locations/:locationId/rotate-public-id')
  rotate(
    @Param('organizationId') organizationId: string,
    @Param('locationId') locationId: string,
    @Request() request: { user: SpatialActor },
    @Body() dto: RevokeWebSessionDto,
  ) {
    return this.web.rotatePublicId(
      organizationId,
      locationId,
      request.user,
      dto.reason,
    );
  }

  @Post('locations/:locationId/revoke-devices')
  revoke(
    @Param('organizationId') organizationId: string,
    @Param('locationId') locationId: string,
    @Request() request: { user: SpatialActor },
    @Body() dto: RevokeWebSessionDto,
  ) {
    return this.web.revokeLocationSessions(
      organizationId,
      locationId,
      request.user,
      dto.reason,
    );
  }
}
