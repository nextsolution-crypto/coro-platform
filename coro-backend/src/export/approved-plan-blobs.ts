import { createHash } from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * Plans techniques dans le snapshot d'approbation (audit M1-10).
 *
 * Avant : chaque snapshot recopiait le base64 complet des plans (jusqu'à
 * 25 Mo chacun), ce qui faisait gonfler la base et les sauvegardes. Le
 * snapshot v3 ne garde qu'une référence : métadonnées + empreinte SHA-256.
 * Le fichier est copié une fois dans le stockage privé, à une clé dérivée de
 * l'empreinte (contenu immuable). Au rendu, le fichier est relu et son
 * empreinte vérifiée ; à défaut, la ligne BuildingPlan est acceptée
 * seulement si son contenu a exactement la même empreinte.
 */

export interface ApprovedPlanReference {
  id: string;
  section: string;
  name: string;
  fileName: string;
  fileSize: number;
  emissionDate: string | null;
  revision: string | null;
  order: number;
  sha256: string;
}

export interface PlanStorage {
  uploadPrivateImmutable(bytes: Buffer, key: string, contentType: string): Promise<unknown>;
  downloadPrivate(key: string): Promise<Buffer>;
}

type PlanReader = {
  buildingPlan: { findMany: (args: any) => PromiseLike<any[]> };
};

const logger = new Logger('ApprovedPlanBlobs');

export function decodePlan(fileBase64: string): Buffer {
  const cleaned = fileBase64.includes(',') ? fileBase64.slice(fileBase64.indexOf(',') + 1) : fileBase64;
  return Buffer.from(cleaned, 'base64');
}

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function planReference(plan: any): ApprovedPlanReference {
  return {
    id: plan.id,
    section: plan.section,
    name: plan.name,
    fileName: plan.fileName,
    fileSize: plan.fileSize,
    emissionDate: plan.emissionDate ?? null,
    revision: plan.revision ?? null,
    order: plan.order,
    sha256: sha256(decodePlan(plan.fileBase64)),
  };
}

export function approvedPlanStorageKey(organizationId: string, digest: string): string {
  const safe = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, '_');
  return `tenant-${safe(organizationId)}/approved-plans/${safe(digest)}.pdf`;
}

/** Copie idempotente des plans courants du projet dans le stockage privé. */
export async function stageApprovedPlans(
  storage: PlanStorage | undefined,
  db: PlanReader,
  organizationId: string,
  projectId: string,
): Promise<number> {
  if (!storage) return 0;
  const plans = await db.buildingPlan.findMany({
    where: { projectId, project: { organizationId } },
    select: { id: true, fileBase64: true },
  });
  let staged = 0;
  for (const plan of plans) {
    const bytes = decodePlan(plan.fileBase64);
    const key = approvedPlanStorageKey(organizationId, sha256(bytes));
    try {
      await storage.uploadPrivateImmutable(bytes, key, 'application/pdf');
      staged++;
    } catch (error) {
      if (error instanceof Error && error.message === 'PRIVATE_OBJECT_ALREADY_EXISTS') continue;
      throw error;
    }
  }
  return staged;
}

/** Copie en arrière-plan : un échec est journalisé, le rendu a un repli. */
export function stageApprovedPlansInBackground(
  storage: PlanStorage | undefined,
  db: PlanReader,
  organizationId: string,
  projectId: string,
): void {
  void stageApprovedPlans(storage, db, organizationId, projectId).catch((error) =>
    logger.warn(
      `Copie des plans approuvés reportée (${projectId}) : ${error instanceof Error ? error.message : 'erreur'}`,
    ),
  );
}

/** Rend les plans d'un snapshot (anciens snapshots avec base64 inclus). */
export async function resolveApprovedPlans(
  plans: any[],
  context: {
    storage?: PlanStorage;
    db: PlanReader;
    organizationId: string;
    projectId: string;
  },
): Promise<any[]> {
  const needsLookup = plans.some((plan) => typeof plan?.fileBase64 !== 'string');
  if (!needsLookup) return plans;
  let rows: any[] | null = null;
  const resolved: any[] = [];
  for (const plan of plans) {
    if (typeof plan?.fileBase64 === 'string') {
      resolved.push(plan);
      continue;
    }
    if (typeof plan?.sha256 !== 'string') throw new Error('APPROVED_PLAN_REFERENCE_INVALID');
    let bytes: Buffer | null = null;
    if (context.storage) {
      try {
        const stored = await context.storage.downloadPrivate(
          approvedPlanStorageKey(context.organizationId, plan.sha256),
        );
        if (sha256(stored) === plan.sha256) bytes = stored;
      } catch {
        bytes = null;
      }
    }
    if (!bytes) {
      rows ??= await context.db.buildingPlan.findMany({
        where: { projectId: context.projectId, project: { organizationId: context.organizationId } },
        select: { id: true, fileBase64: true },
      });
      const row = rows.find((candidate) => candidate.id === plan.id);
      const candidate = row ? decodePlan(row.fileBase64) : null;
      if (candidate && sha256(candidate) === plan.sha256) bytes = candidate;
    }
    if (!bytes) throw new Error('APPROVED_PLAN_UNAVAILABLE');
    resolved.push({ ...plan, fileBase64: bytes.toString('base64') });
  }
  return resolved;
}
