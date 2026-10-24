import { PrismaService } from '../prisma/prisma.service';
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
    private prisma: PrismaService,
    private projectFilesService: ProjectFilesService,
    private offlineDocumentsService: OfflineDocumentsService,
  ) {}

  private async buildingScope(clientUser: {
    sub: string;
    organizationId: string;
  }): Promise<string[]> {
    const user = await this.prisma.clientUser.findFirst({
      where: {
        id: clientUser.sub,
        organizationId: clientUser.organizationId,
        isActive: true,
      },
      select: { clientId: true, role: true, buildingIds: true, email: true },
    });
    if (!user) return [];
    const grants = await this.prisma.buildingDocumentGrant.findMany({
      where: {
        clientUserId: clientUser.sub,
        organizationId: clientUser.organizationId,
        canUpload: true,
      },
      select: { buildingId: true },
    });
    const now = new Date();
    const assignments = await this.prisma.customerPortfolioAssignment.findMany({
      where: {
        organizationId: clientUser.organizationId,
        subjectType: 'CLIENT_USER',
        clientUserId: clientUser.sub,
        status: 'ACTIVE',
        permissions: { has: 'NETWORK_SUPERVISION_READ' },
        effectiveFrom: { lte: now },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
      },
      select: {
        scope: true,
        buildingId: true,
        portfolioId: true,
        regionId: true,
      },
    });
    const portfolioIds = assignments
      .filter((a) => a.scope === 'PORTFOLIO' && a.portfolioId)
      .map((a) => a.portfolioId!);
    const regionIds = assignments
      .filter((a) => a.scope === 'REGION' && a.regionId)
      .map((a) => a.regionId!);
    const memberships =
      portfolioIds.length || regionIds.length
        ? await this.prisma.customerPortfolioBuildingMembership.findMany({
            where: {
              organizationId: clientUser.organizationId,
              OR: [
                ...(portfolioIds.length
                  ? [{ portfolioId: { in: portfolioIds } }]
                  : []),
                ...(regionIds.length ? [{ regionId: { in: regionIds } }] : []),
              ],
            },
            select: { buildingId: true },
          })
        : [];
    const scopeIds = [
      ...user.buildingIds,
      ...grants.map((g) => g.buildingId),
      ...assignments
        .filter((a) => a.scope === 'BUILDING' && a.buildingId)
        .map((a) => a.buildingId!),
      ...memberships.map((m) => m.buildingId),
    ];
    const buildings = await this.prisma.building.findMany({
      where: {
        clientId: user.clientId,
        organizationId: clientUser.organizationId,
        ...(user.role === 'CLIENT_CORPORATE'
          ? {}
          : {
              OR: [
                { id: { in: scopeIds } },
                ...(user.email
                  ? [
                      {
                        responsableEmail: {
                          equals: user.email,
                          mode: 'insensitive' as const,
                        },
                      },
                    ]
                  : []),
              ],
            }),
      },
      select: { id: true },
    });
    return buildings.map((b) => b.id);
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
  async issueOfflineLease(
    @Param('id') id: string,
    @Body() body: { deviceId: string },
    @Request() req: any,
  ) {
    return this.offlineDocumentsService.issueLease({
      clientUserId: req.clientUser.sub,
      organizationId: req.clientUser.organizationId,
      permittedBuildingIds: await this.buildingScope(req.clientUser),
      deviceId: body.deviceId,
      fileId: id,
    });
  }

  @Post('offline/reconcile')
  async reconcileOffline(
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
      permittedBuildingIds: await this.buildingScope(req.clientUser),
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
  async currentVersion(@Param('id') id: string, @Request() req: any) {
    return this.projectFilesService.resolveCurrentVersion(
      id,
      req.clientUser.organizationId,
      new Date(),
      await this.buildingScope(req.clientUser),
    );
  }

  @Get(':projectId')
  @EvidenceReadAccess()
  async getFiles(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Query('visibility') visibility?: string,
  ) {
    return this.projectFilesService.getFilesForProject(
      projectId,
      'shared',
      req.clientUser.organizationId,
      await this.buildingScope(req.clientUser),
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
      permittedBuildingIds: await this.buildingScope(req.clientUser),
    });
  }

  @Get('file/:id/content')
  @EvidenceReadAccess()
  async downloadPrivate(@Param('id') id: string, @Request() req: any) {
    const file = await this.projectFilesService.downloadPrivateFile(
      id,
      req.clientUser.organizationId,
      await this.buildingScope(req.clientUser),
      true,
    );
    return new StreamableFile(file.buffer, {
      type: file.mimeType,
      disposition: `attachment; filename="${file.name.replace(/["\r\n]/g, '_')}"`,
    });
  }

  @Get('file/:id/history')
  @EvidenceReadAccess()
  async history(@Param('id') id: string, @Request() req: any) {
    return this.projectFilesService.getLifecycleHistory(
      id,
      req.clientUser.organizationId,
      await this.buildingScope(req.clientUser),
    );
  }
}
