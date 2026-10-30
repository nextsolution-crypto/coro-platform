import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectFilesService } from '../project-files/project-files.service';
import { KnowledgeActor } from '../knowledge/knowledge.types';

@Injectable()
export class BuildingDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: ProjectFilesService,
  ) {}

  async access(actor: KnowledgeActor, buildingId: string) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, organizationId: actor.organizationId, isActive: true },
      select: { id: true, name: true, clientId: true, responsableEmail: true, client: { select: { isActive: true } } },
    });
    if (!building || !building.client.isActive) throw new NotFoundException('Bâtiment introuvable');
    if (actor.type === 'INTERNAL_USER') {
      const user = await this.prisma.user.findFirst({
        where: {
          id: actor.id,
          organizationId: actor.organizationId,
          isActive: true,
        },
        select: { id: true, role: true },
      });
      if (!user) throw new ForbiddenException('Compte inactif');
      return {
        building,
        canUpload: true,
        canManage: ['ADMIN', 'SUPER_ADMIN'].includes(user.role),
      };
    }
    const user = await this.prisma.clientUser.findFirst({
      where: {
        id: actor.id,
        organizationId: actor.organizationId,
        isActive: true,
      },
      select: { clientId: true, role: true, buildingIds: true, email: true },
    });
    if (!user)
      throw new NotFoundException('Bâtiment introuvable');
    const sameClient = user.clientId === building.clientId;
    if (user.role === 'CLIENT_MANAGER' && !sameClient)
      throw new NotFoundException('Bâtiment introuvable');
    const grant = await this.prisma.buildingDocumentGrant.findUnique({
      where: {
        buildingId_clientUserId: { buildingId, clientUserId: actor.id },
      },
    });
    const defaultManager = sameClient && (
      user.role === 'CLIENT_CORPORATE' ||
      user.buildingIds.includes(buildingId) ||
      (!!building.responsableEmail &&
        building.responsableEmail.toLowerCase() === user.email.toLowerCase()));
    // Regional/portfolio supervisors retain their live assignment perimeter.
    const now = new Date();
    const assignments = await this.prisma.customerPortfolioAssignment.findMany({
      where: {
        organizationId: actor.organizationId,
        subjectType: 'CLIENT_USER',
        clientUserId: actor.id,
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
    let supervisor = assignments.some(
      (a) => a.scope === 'BUILDING' && a.buildingId === buildingId,
    );
    const portfolios = assignments
      .filter((a) => a.scope === 'PORTFOLIO' && a.portfolioId)
      .map((a) => a.portfolioId!);
    const regions = assignments
      .filter((a) => a.scope === 'REGION' && a.regionId)
      .map((a) => a.regionId!);
    if (!supervisor && (portfolios.length || regions.length))
      supervisor =
        !!(await this.prisma.customerPortfolioBuildingMembership.findFirst({
          where: {
            organizationId: actor.organizationId,
            buildingId,
            OR: [
              ...(portfolios.length
                ? [{ portfolioId: { in: portfolios } }]
                : []),
              ...(regions.length ? [{ regionId: { in: regions } }] : []),
            ],
          },
          select: { id: true },
        }));
    const corporateRead = user.role === 'CLIENT_CORPORATE';
    if (!corporateRead && !defaultManager && !supervisor && !grant?.canUpload)
      throw new ForbiddenException('Accès documentaire non accordé');
    return {
      building,
      canUpload: grant ? grant.canUpload : defaultManager || supervisor,
      canManage: (sameClient && defaultManager) || supervisor,
    };
  }

  async list(
    actor: KnowledgeActor,
    buildingId: string,
    options: {
      q?: string;
      category?: string;
      cursor?: string;
      history?: string;
    } = {},
  ) {
    const access = await this.access(actor, buildingId);
    const now = new Date();
    const q =
      typeof options.q === 'string' ? options.q.trim().slice(0, 200) : '';
    const files = await this.prisma.projectFile.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
        ...(typeof options.category === 'string' && options.category
          ? { category: options.category }
          : {}),
        OR: [
          { buildingId },
          {
            buildingId: null,
            project: { buildingId, organizationId: actor.organizationId },
          },
        ],
        ...(actor.type === 'CLIENT_USER' ? { visibility: 'shared' } : {}),
        // Work-in-progress project files stay in the project until approved.
        AND: [
          { OR: [{ projectId: null }, { approvedAt: { not: null } }] },
          ...(options.history === 'true'
            ? []
            : [
                { lifecycleState: { notIn: ['REVOKED', 'SUPERSEDED'] as any } },
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                {
                  OR: [
                    { supersededEffectiveAt: null },
                    { supersededEffectiveAt: { gt: now } },
                  ],
                },
              ]),
        ],
      },
      select: {
        id: true,
        name: true,
        category: true,
        size: true,
        mimeType: true,
        version: true,
        parentId: true,
        projectId: true,
        visibility: true,
        lifecycleState: true,
        lockVersion: true,
        effectiveAt: true,
        expiresAt: true,
        supersededEffectiveAt: true,
        createdAt: true,
        project: { select: { name: true } },
        knowledgeIngestions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { status: true, lastErrorCode: true, indexedAt: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 201,
      ...(typeof options.cursor === 'string' && options.cursor
        ? { cursor: { id: options.cursor }, skip: 1 }
        : {}),
    });
    return {
      building: { id: access.building.id, name: access.building.name },
      canUpload: access.canUpload,
      canManage: access.canManage,
      nextCursor: files.length > 200 ? files[199].id : null,
      files: files.slice(0, 200).map((f) => ({
        ...f,
        knowledgeSupported: isIndexable(f.mimeType),
        knowledgeStatus: !isIndexable(f.mimeType)
          ? 'UNSUPPORTED'
          : (f.knowledgeIngestions[0]?.status ??
            (f.lifecycleState === 'APPROVED' ? 'QUEUED' : 'AWAITING_APPROVAL')),
      })),
    };
  }

  async upload(
    actor: KnowledgeActor,
    buildingId: string,
    file: Express.Multer.File,
    body: { category?: string; visibility?: string; parentId?: string },
  ) {
    const access = await this.access(actor, buildingId);
    if (!access.canUpload) throw new ForbiddenException('Dépôt non autorisé');
    if (!file?.buffer?.length) throw new BadRequestException('Fichier requis');
    const mimeType = documentMime(file.originalname);
    return this.files.uploadFile({
      buildingId,
      organizationId: actor.organizationId,
      name: file.originalname,
      category:
        typeof body.category === 'string'
          ? body.category.trim().slice(0, 100) || 'documents_reference'
          : 'documents_reference',
      buffer: file.buffer,
      size: file.buffer.length,
      mimeType,
      parentId: body.parentId,
      visibility:
        actor.type === 'CLIENT_USER' ? 'shared' : (body.visibility ?? 'shared'),
      ...(actor.type === 'CLIENT_USER'
        ? { uploadedByClientId: actor.id }
        : { uploadedById: actor.id }),
    });
  }

  async content(actor: KnowledgeActor, buildingId: string, id: string) {
    await this.access(actor, buildingId);
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id,
        organizationId: actor.organizationId,
        OR: [
          { buildingId },
          { buildingId: null, project: { buildingId, organizationId: actor.organizationId } },
        ],
        ...(actor.type === 'CLIENT_USER' ? { visibility: 'shared' } : {}),
      },
      select: { id: true },
    });
    if (!file) throw new NotFoundException('Document introuvable');
    return this.files.downloadPrivateFile(
      id,
      actor.organizationId,
      [buildingId],
      actor.type === 'CLIENT_USER',
    );
  }

  async grants(actor: KnowledgeActor, buildingId: string) {
    if (!(await this.access(actor, buildingId)).canManage)
      throw new ForbiddenException('Gestion des permissions non autorisée');
    const users = await this.prisma.clientUser.findMany({
      where: {
        organizationId: actor.organizationId,
        clientId: (await this.access(actor, buildingId)).building.clientId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        buildingIds: true,
      },
    });
    const grants = await this.prisma.buildingDocumentGrant.findMany({
      where: { organizationId: actor.organizationId, buildingId },
      select: { clientUserId: true, canUpload: true },
    });
    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      defaultAllowed:
        u.role === 'CLIENT_CORPORATE' || u.buildingIds.includes(buildingId),
      canUpload: grants.find((g) => g.clientUserId === u.id)?.canUpload ?? null,
    }));
  }

  async setGrant(
    actor: KnowledgeActor,
    buildingId: string,
    clientUserId: string,
    canUpload: boolean,
  ) {
    const access = await this.access(actor, buildingId);
    if (!access.canManage)
      throw new ForbiddenException('Gestion des permissions non autorisée');
    if (typeof canUpload !== 'boolean')
      throw new BadRequestException('Permission invalide');
    const user = await this.prisma.clientUser.findFirst({
      where: {
        id: clientUserId,
        organizationId: actor.organizationId,
        clientId: access.building.clientId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Utilisateur client introuvable');
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.buildingDocumentGrant.findUnique({
        where: { buildingId_clientUserId: { buildingId, clientUserId } },
      });
      const result = await tx.buildingDocumentGrant.upsert({
        where: { buildingId_clientUserId: { buildingId, clientUserId } },
        create: {
          buildingId,
          clientUserId,
          organizationId: actor.organizationId,
          grantedById: actor.id,
          canUpload,
        },
        update: { canUpload, grantedById: actor.id },
      });
      await tx.auditLog.create({
        data: {
          action: 'BUILDING_DOCUMENT_PERMISSION_CHANGED',
          entityType: 'Building',
          entityId: buildingId,
          organizationId: actor.organizationId,
          description: 'Modification du droit de dépôt documentaire',
          ...(actor.type === 'CLIENT_USER'
            ? { clientUserId: actor.id }
            : { userId: actor.id }),
          metadata: {
            targetClientUserId: clientUserId,
            previousCanUpload: previous?.canUpload ?? null,
            canUpload,
          },
        },
      });
      return result;
    });
  }
}

const formats: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  doc: 'application/msword',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  webp: 'image/webp',
  dwg: 'application/acad',
  dxf: 'application/dxf',
  ifc: 'application/x-step',
};
export function documentMime(name: string) {
  const mime = formats[name.split('.').pop()?.toLowerCase() ?? ''];
  if (!mime)
    throw new BadRequestException('Format documentaire non pris en charge');
  return mime;
}
export const INDEXABLE_DOCUMENT_MIMES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  formats.docx,
  formats.xlsx,
  'image/jpeg',
  'image/png',
  'image/tiff',
];
export function isIndexable(mime: string) {
  return INDEXABLE_DOCUMENT_MIMES.includes(mime);
}
