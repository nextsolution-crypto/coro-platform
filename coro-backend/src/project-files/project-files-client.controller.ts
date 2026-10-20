import {
  Controller,
  Delete,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { ProjectFilesService } from './project-files.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { EvidenceReadAccess } from '../auth/organization-access.decorator';
import { OfflineDocumentsService } from './offline-documents.service';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

@Controller('project-files/client')
@UseGuards(ClientJwtGuard, OrganizationStatusGuard)
export class ProjectFilesClientController {
  constructor(
    private projectFilesService: ProjectFilesService,
    private offlineDocumentsService: OfflineDocumentsService,
  ) {}

  private buildingScope(clientUser: {
    role?: string;
    buildingIds?: string[];
  }): string[] | undefined {
    return clientUser.role === 'CLIENT_MANAGER'
      ? (clientUser.buildingIds ?? [])
      : undefined;
  }

  @Get('offline/config')
  offlineConfiguration() {
    return this.offlineDocumentsService.getPublicConfiguration();
  }

  @Get('offline/registration-options')
  offlineRegistrationOptions(@Request() req: any) {
    return this.offlineDocumentsService.registrationOptions({
      clientUserId: req.clientUser.sub,
      email: req.clientUser.email,
      displayName: req.clientUser.email,
    });
  }

  @Post('offline/devices')
  registerOfflineDevice(
    @Body()
    body: {
      credentialId: string;
      label: string;
      prfSupported: boolean;
      registrationResponse: RegistrationResponseJSON;
    },
    @Request() req: any,
  ) {
    return this.offlineDocumentsService.registerDevice({
      clientUserId: req.clientUser.sub,
      organizationId: req.clientUser.organizationId,
      mfaVerifiedAt: req.clientUser.mfaVerifiedAt,
      ...body,
    });
  }

  @Post('offline/files/:id/lease')
  issueOfflineLease(
    @Param('id') id: string,
    @Body() body: { deviceId: string },
    @Request() req: any,
  ) {
    return this.offlineDocumentsService.issueLease({
      clientUserId: req.clientUser.sub,
      organizationId: req.clientUser.organizationId,
      permittedBuildingIds: this.buildingScope(req.clientUser),
      deviceId: body.deviceId,
      fileId: id,
    });
  }

  @Post('offline/reconcile')
  reconcileOffline(
    @Body()
    body: {
      deviceId: string;
      leaseIds: string[];
      events: Array<{
        requestId: string;
        leaseId?: string;
        eventType: string;
        occurredAt: string;
      }>;
    },
    @Request() req: any,
  ) {
    return this.offlineDocumentsService.reconcile({
      clientUserId: req.clientUser.sub,
      organizationId: req.clientUser.organizationId,
      permittedBuildingIds: this.buildingScope(req.clientUser),
      ...body,
    });
  }

  @Delete('offline/devices/:id')
  revokeOfflineDevice(@Param('id') id: string, @Request() req: any) {
    return this.offlineDocumentsService.revokeDevice({
      clientUserId: req.clientUser.sub,
      organizationId: req.clientUser.organizationId,
      deviceId: id,
    });
  }

  @Get('file/:id/current')
  @EvidenceReadAccess()
  currentVersion(@Param('id') id: string, @Request() req: any) {
    return this.projectFilesService.resolveCurrentVersion(
      id,
      req.clientUser.organizationId,
      new Date(),
      this.buildingScope(req.clientUser),
    );
  }

  @Get(':projectId')
  @EvidenceReadAccess()
  getFiles(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Query('visibility') visibility?: string,
  ) {
    return this.projectFilesService.getFilesForProject(
      projectId,
      visibility,
      req.clientUser.organizationId,
      this.buildingScope(req.clientUser),
    );
  }

  @Post(':projectId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { category: string; comment?: string },
    @Request() req: any,
  ) {
    return this.projectFilesService.uploadFile({
      projectId,
      organizationId: req.clientUser.organizationId,
      name: file.originalname,
      category: body.category || 'fichiers_client',
      buffer: file.buffer,
      mimeType: file.mimetype,
      size: file.size,
      visibility: 'shared',
      uploadedByClientId: req.clientUser.sub,
      permittedBuildingIds: this.buildingScope(req.clientUser),
    });
  }

  @Get('file/:id/content')
  @EvidenceReadAccess()
  async downloadPrivate(@Param('id') id: string, @Request() req: any) {
    const file = await this.projectFilesService.downloadPrivateFile(
      id,
      req.clientUser.organizationId,
      this.buildingScope(req.clientUser),
      true,
    );
    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.name.replace(/["\r\n]/g, '_')}"`,
    });
  }

  @Get('file/:id/history')
  @EvidenceReadAccess()
  history(@Param('id') id: string, @Request() req: any) {
    return this.projectFilesService.getLifecycleHistory(
      id,
      req.clientUser.organizationId,
      this.buildingScope(req.clientUser),
    );
  }
}
