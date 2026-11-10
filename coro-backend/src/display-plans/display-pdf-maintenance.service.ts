import { Injectable } from '@nestjs/common';
import {
  DisplayPdfRenderJobStatus,
  DisplayPlanPublicationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PrivateObjectInventoryItem = {
  key: string;
  sizeBytes: number;
  lastModified: Date;
};

export type DisplayPdfRetentionPolicy = {
  succeededDays: number;
  failedDays: number;
  cancelledDays: number;
  orphanGraceDays: number;
};

const DAY_MS = 86_400_000;
const PROTECTED_PUBLICATION_STATUSES: DisplayPlanPublicationStatus[] = [
  'REVIEW',
  'APPROVED',
  'PUBLISHED',
  'SUSPENDED',
];

export const DEFAULT_DISPLAY_PDF_RETENTION: DisplayPdfRetentionPolicy = {
  succeededDays: 90,
  failedDays: 30,
  cancelledDays: 30,
  orphanGraceDays: 7,
};

@Injectable()
export class DisplayPdfMaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async previewJobRetention(
    now = new Date(),
    policy = DEFAULT_DISPLAY_PDF_RETENTION,
  ) {
    const cutoffs: Partial<Record<DisplayPdfRenderJobStatus, Date>> = {
      SUCCEEDED: new Date(now.getTime() - policy.succeededDays * DAY_MS),
      FAILED: new Date(now.getTime() - policy.failedDays * DAY_MS),
      CANCELLED: new Date(now.getTime() - policy.cancelledDays * DAY_MS),
    };
    const candidates = await this.prisma.displayPdfRenderJob.findMany({
      where: {
        OR: Object.entries(cutoffs).map(([status, cutoff]) => ({
          status: status as DisplayPdfRenderJobStatus,
          completedAt: { lt: cutoff },
        })),
        publication: { status: { notIn: PROTECTED_PUBLICATION_STATUSES } },
      },
      select: {
        id: true,
        organizationId: true,
        publicationId: true,
        status: true,
        completedAt: true,
        outputStorageKey: true,
      },
      orderBy: [{ completedAt: 'asc' }, { id: 'asc' }],
    });
    return {
      dryRun: true as const,
      policy,
      candidates,
      note: "Aucun job ni objet n'est supprimé; les objets doivent être réconciliés séparément.",
    };
  }

  async previewOrphanPrivateObjects(
    inventory: PrivateObjectInventoryItem[],
    now = new Date(),
    policy = DEFAULT_DISPLAY_PDF_RETENTION,
  ) {
    const [jobs, publications] = await Promise.all([
      this.prisma.displayPdfRenderJob.findMany({
        where: { outputStorageKey: { not: null } },
        select: { outputStorageKey: true },
      }),
      this.prisma.displayPlanPublication.findMany({
        select: {
          id: true,
          organizationId: true,
          status: true,
          variantStorageKey: true,
        },
      }),
    ]);
    const referenced = new Set<string>();
    for (const job of jobs)
      if (job.outputStorageKey) referenced.add(job.outputStorageKey);
    for (const publication of publications)
      if (publication.variantStorageKey)
        referenced.add(publication.variantStorageKey);
    const protectedPrefixes = publications
      .filter((item) => PROTECTED_PUBLICATION_STATUSES.includes(item.status))
      .map(
        (item) =>
          `tenant-${item.organizationId}/display-plan-publications/${item.id}/`,
      );
    const cutoff = now.getTime() - policy.orphanGraceDays * DAY_MS;
    const candidates = inventory
      .filter((item) => item.lastModified.getTime() < cutoff)
      .filter((item) =>
        /^tenant-[^/]+\/display-plan-publications\/[^/]+\/(?:pdf-raster|variant)-/.test(
          item.key,
        ),
      )
      .filter((item) => !referenced.has(item.key))
      .filter(
        (item) =>
          !protectedPrefixes.some((prefix) => item.key.startsWith(prefix)),
      )
      .sort((a, b) => a.key.localeCompare(b.key));
    return {
      dryRun: true as const,
      graceDays: policy.orphanGraceDays,
      scanned: inventory.length,
      candidateCount: candidates.length,
      candidateBytes: candidates.reduce((sum, item) => sum + item.sizeBytes, 0),
      candidates,
      note: "Inventaire seulement; aucune API de suppression n'est appelée.",
    };
  }
}
