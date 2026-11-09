import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import {
  ArchiveSpatialResourceDto,
  CreateDisplayLocationDto,
  CreateFloorDto,
  CreateZoneDto,
  SpatialListQueryDto,
  UpdateDisplayLocationDto,
  UpdateFloorDto,
  UpdateZoneDto,
} from './dto/spatial.dto';
import { SpatialService } from './spatial.service';
import type { SpatialActor } from './spatial-authorization.service';

type SpatialRequest = { user: SpatialActor };

@Controller('organizations/:organizationId/buildings/:buildingId/spatial')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class SpatialController {
  constructor(private readonly spatial: SpatialService) {}

  @Get('floors')
  listFloors(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Query() query: SpatialListQueryDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.listFloors(organizationId, buildingId, req.user, query);
  }

  @Post('floors')
  createFloor(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateFloorDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.createFloor(organizationId, buildingId, dto, req.user);
  }

  @Get('floors/:floorId')
  getFloor(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.getFloor(organizationId, buildingId, floorId, req.user);
  }

  @Patch('floors/:floorId')
  updateFloor(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Body() dto: UpdateFloorDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.updateFloor(
      organizationId,
      buildingId,
      floorId,
      dto,
      req.user,
    );
  }

  @Post('floors/:floorId/archive')
  archiveFloor(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Body() dto: ArchiveSpatialResourceDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.archiveFloor(
      organizationId,
      buildingId,
      floorId,
      dto,
      req.user,
    );
  }

  @Get('floors/:floorId/zones')
  listZones(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Query() query: SpatialListQueryDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.listZones(
      organizationId,
      buildingId,
      floorId,
      req.user,
      query,
    );
  }

  @Post('floors/:floorId/zones')
  createZone(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Body() dto: CreateZoneDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.createZone(
      organizationId,
      buildingId,
      floorId,
      dto,
      req.user,
    );
  }

  @Get('floors/:floorId/zones/:zoneId')
  getZone(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('zoneId') zoneId: string,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.getZone(
      organizationId,
      buildingId,
      floorId,
      zoneId,
      req.user,
    );
  }

  @Patch('floors/:floorId/zones/:zoneId')
  updateZone(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: UpdateZoneDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.updateZone(
      organizationId,
      buildingId,
      floorId,
      zoneId,
      dto,
      req.user,
    );
  }

  @Post('floors/:floorId/zones/:zoneId/archive')
  archiveZone(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('floorId') floorId: string,
    @Param('zoneId') zoneId: string,
    @Body() dto: ArchiveSpatialResourceDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.archiveZone(
      organizationId,
      buildingId,
      floorId,
      zoneId,
      dto,
      req.user,
    );
  }

  @Get('display-locations')
  listLocations(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Query() query: SpatialListQueryDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.listLocations(
      organizationId,
      buildingId,
      req.user,
      query,
    );
  }

  @Post('display-locations')
  createLocation(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Body() dto: CreateDisplayLocationDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.createLocation(
      organizationId,
      buildingId,
      dto,
      req.user,
    );
  }

  @Get('display-locations/:locationId')
  getLocation(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('locationId') locationId: string,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.getLocation(
      organizationId,
      buildingId,
      locationId,
      req.user,
    );
  }

  @Patch('display-locations/:locationId')
  updateLocation(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateDisplayLocationDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.updateLocation(
      organizationId,
      buildingId,
      locationId,
      dto,
      req.user,
    );
  }

  @Post('display-locations/:locationId/archive')
  archiveLocation(
    @Param('organizationId') organizationId: string,
    @Param('buildingId') buildingId: string,
    @Param('locationId') locationId: string,
    @Body() dto: ArchiveSpatialResourceDto,
    @Request() req: SpatialRequest,
  ) {
    return this.spatial.archiveLocation(
      organizationId,
      buildingId,
      locationId,
      dto,
      req.user,
    );
  }
}
