import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from '../auth/platform-permission.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { CommercialDossierParamsDto } from './commercial-dossier.dto';
import { CommercialDossierService } from './commercial-dossier.service';

@Controller('admin/v1/commercial/dossiers')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
@RequirePlatformPermission(PlatformPermission.COMMERCIAL_PROPOSAL_PREPARE)
export class CommercialDossierController {
  constructor(private readonly service: CommercialDossierService) {}

  @Get(':targetType/:targetId')
  get(@Param() params: CommercialDossierParamsDto) {
    return this.service.get(params.targetType, params.targetId);
  }
}
