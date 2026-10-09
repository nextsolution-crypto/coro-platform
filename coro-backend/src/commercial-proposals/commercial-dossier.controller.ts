import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { CommercialDossierParamsDto } from './commercial-dossier.dto';
import { CommercialDossierService } from './commercial-dossier.service';

@Controller('admin/v1/commercial/dossiers')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialDossierController {
  constructor(private readonly service: CommercialDossierService) {}

  @Get(':targetType/:targetId')
  get(@Param() params: CommercialDossierParamsDto) {
    return this.service.get(params.targetType, params.targetId);
  }
}
