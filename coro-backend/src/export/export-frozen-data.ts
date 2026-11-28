/**
 * Données « hors document » lues par le rendu PDF (audit M1-01).
 *
 * Le texte du plan vit dans Document.content, mais le PDF lit aussi les
 * procédures (par défaut, surcharges organisation et projet, procédures IA)
 * et le module 7. Pour que le PDF officiel corresponde exactement à ce qui a
 * été approuvé, ces données sont figées dans le snapshot d'approbation
 * (schéma v3) et le rendu officiel ne lit plus que ce snapshot.
 *
 * Le rendu courant (aperçu, brouillon) utilise la même interface, branchée
 * sur la base en direct.
 */

export const FROZEN_EXPORT_DATA_VERSION = 1;

/** Ligne du registre de formation tirée des questionnaires post-formation. */
export interface TrainingRegisterRow {
  nom: string;
  formation: string;
  date: string;
  formateur: string;
  resultat: string;
  reussi: boolean;
}

export interface FrozenExportData {
  version: typeof FROZEN_EXPORT_DATA_VERSION;
  procedureDefaults: Record<string, unknown>[];
  organizationOverrides: Record<string, unknown>[];
  projectOverrides: Record<string, unknown>[];
  customProcedures: Record<string, unknown>[];
  module7: {
    quartsData: unknown;
    photosData: unknown;
    extraData: unknown;
  } | null;
  /** Absent des snapshots antérieurs : le registre reste alors manuel. */
  trainingRegister?: TrainingRegisterRow[];
}

/** Interface de lecture utilisée par les builders PDF. */
export interface ExportDataSource {
  /** Procédures par défaut actives, triées par code. */
  procedureDefaults(): Promise<any[]>;
  /** Surcharges de l'organisation (projectId nul). */
  organizationOverrides(): Promise<any[]>;
  /** Surcharges propres au projet. */
  projectOverrides(): Promise<any[]>;
  /** Procédures IA demandées, limitées au projet ou à la bibliothèque publiée. */
  customProcedures(ids: string[]): Promise<any[]>;
  module7(): Promise<FrozenExportData['module7']>;
  /** Participants des questionnaires post-formation du bâtiment du projet. */
  trainingRegister?(): Promise<TrainingRegisterRow[]>;
}

type Reader = {
  procedureDefault: { findMany: (args: any) => PromiseLike<any[]> };
  procedureOverride: { findMany: (args: any) => PromiseLike<any[]> };
  customProcedure: { findMany: (args: any) => PromiseLike<any[]> };
  module7Data: { findUnique: (args: any) => PromiseLike<any> };
  project?: { findFirst: (args: any) => PromiseLike<any> };
  trainingQuestionnaireResponse?: { findMany: (args: any) => PromiseLike<any[]> };
  user?: { findMany: (args: any) => PromiseLike<any[]> };
};

const civil = (value: Date | string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

async function readTrainingRegister(
  db: Reader,
  projectId: string,
  organizationId: string,
): Promise<TrainingRegisterRow[]> {
  if (!db.project || !db.trainingQuestionnaireResponse) return [];
  const project = await db.project.findFirst({
    where: { id: projectId, organizationId },
    select: { buildingId: true },
  });
  if (!project?.buildingId) return [];
  const responses = await db.trainingQuestionnaireResponse.findMany({
    where: { session: { organizationId, buildingId: project.buildingId } },
    orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
    select: {
      participantName: true,
      percent: true,
      passed: true,
      submittedAt: true,
      session: {
        select: {
          title: true,
          createdById: true,
          projectActivity: { select: { label: true, customLabel: true, scheduledDate: true } },
        },
      },
    },
  });
  const trainerIds = [...new Set(responses.map((r: any) => r.session.createdById))];
  const trainers = trainerIds.length && db.user
    ? await db.user.findMany({
        where: { id: { in: trainerIds }, organizationId },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const names = new Map(trainers.map((t: any) => [t.id, `${t.firstName} ${t.lastName}`]));
  return responses.map((r: any) => ({
    nom: r.participantName,
    formation: r.session.projectActivity?.customLabel || r.session.projectActivity?.label || r.session.title,
    date: civil(r.session.projectActivity?.scheduledDate ?? r.submittedAt),
    formateur: names.get(r.session.createdById) ?? '',
    resultat: `${r.percent} %`,
    reussi: Boolean(r.passed),
  }));
}

const VOLATILE_KEYS = new Set(['createdAt', 'updatedAt']);

/** Copie JSON sans horodatages : stable pour l'empreinte d'approbation. */
function plain(rows: any[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const json = JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
    for (const key of VOLATILE_KEYS) delete json[key];
    return json;
  });
}

function requestedCustomIds(content: any): string[] {
  const ids = content?.module4?.customProcedureIds;
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.filter((id: unknown) => typeof id === 'string'))].sort();
}

export function liveExportDataSource(
  db: Reader,
  projectId: string,
  organizationId: string,
): ExportDataSource {
  if (!projectId || !organizationId) {
    // Sans ces deux clés, les filtres Prisma deviendraient vides et
    // liraient les données d'autres clients.
    throw new Error('EXPORT_DATA_SCOPE_MISSING');
  }
  return {
    procedureDefaults: async () =>
      db.procedureDefault.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),
    organizationOverrides: async () =>
      db.procedureOverride.findMany({
        where: { organizationId, projectId: null },
        orderBy: { procedureId: 'asc' },
      }),
    projectOverrides: async () =>
      db.procedureOverride.findMany({
        where: { organizationId, projectId },
        orderBy: { procedureId: 'asc' },
      }),
    customProcedures: async (ids: string[]) =>
      ids.length === 0
        ? []
        : db.customProcedure.findMany({
            where: {
              organizationId,
              id: { in: ids },
              OR: [{ projectId }, { isPublished: true }],
            },
            orderBy: { id: 'asc' },
          }),
    module7: async () => {
      const row = await db.module7Data.findUnique({ where: { projectId } });
      return row
        ? {
            quartsData: row.quartsData ?? {},
            photosData: row.photosData ?? {},
            extraData: row.extraData ?? {},
          }
        : null;
    },
    trainingRegister: async () => readTrainingRegister(db, projectId, organizationId),
  };
}

/** Capture, dans la transaction de soumission ou d'approbation. */
export async function captureFrozenExportData(
  db: Reader,
  input: { projectId: string; organizationId: string; content: unknown },
): Promise<FrozenExportData> {
  const live = liveExportDataSource(db, input.projectId, input.organizationId);
  const [defaults, orgOverrides, projectOverrides, customs, module7, trainingRegister] =
    await Promise.all([
      live.procedureDefaults(),
      live.organizationOverrides(),
      live.projectOverrides(),
      live.customProcedures(requestedCustomIds(input.content)),
      live.module7(),
      live.trainingRegister ? live.trainingRegister() : Promise.resolve([]),
    ]);
  return {
    version: FROZEN_EXPORT_DATA_VERSION,
    procedureDefaults: plain(defaults),
    organizationOverrides: plain(orgOverrides),
    projectOverrides: plain(projectOverrides),
    customProcedures: plain(customs),
    module7: module7 ? (JSON.parse(JSON.stringify(module7)) as any) : null,
    ...(trainingRegister.length ? { trainingRegister } : {}),
  };
}

export function isFrozenExportData(value: any): value is FrozenExportData {
  return (
    !!value &&
    value.version === FROZEN_EXPORT_DATA_VERSION &&
    Array.isArray(value.procedureDefaults) &&
    Array.isArray(value.organizationOverrides) &&
    Array.isArray(value.projectOverrides) &&
    Array.isArray(value.customProcedures) &&
    (value.module7 === null || typeof value.module7 === 'object')
  );
}

export function frozenExportDataSource(data: FrozenExportData): ExportDataSource {
  if (!isFrozenExportData(data)) throw new Error('APPROVED_SNAPSHOT_UNSUPPORTED');
  return {
    procedureDefaults: async () => data.procedureDefaults,
    organizationOverrides: async () => data.organizationOverrides,
    projectOverrides: async () => data.projectOverrides,
    customProcedures: async (ids: string[]) =>
      data.customProcedures.filter((row) => ids.includes(String(row.id))),
    module7: async () => data.module7,
    trainingRegister: async () => data.trainingRegister ?? [],
  };
}
