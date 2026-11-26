import { Prisma } from '@prisma/client';

/**
 * Historique des versions approuvées, avec signature et décisions prises
 * ensuite (refus du client, déverrouillage par le conseiller).
 * Partagé par l'app conseiller et le portail client.
 */
export type VersionHistoryEntry = {
  id: string;
  versionNumber: number;
  label: string;
  createdAt: Date;
  approvedBy: string | null;
  approvedAt: string | null;
  signedBy: string | null;
  signedAt: string | null;
  signedEmail: string | null;
  /** Refus du client ou déverrouillage, survenu sur cette version. */
  decision: {
    type: 'CLIENT_REFUSED' | 'REOPENED';
    by: string | null;
    at: Date;
    reason: string;
  } | null;
  status: 'SIGNED' | 'REFUSED' | 'REOPENED' | 'AWAITING_SIGNATURE';
};

type Reader = {
  $queryRaw: <T = unknown>(query: Prisma.Sql) => Promise<T>;
  projectComment: { findMany: (args: any) => Promise<any[]> };
  auditLog: { findMany: (args: any) => Promise<any[]> };
};

const REFUSAL_PREFIX = '[Refus client]';

export async function buildVersionHistory(
  prisma: Reader,
  projectId: string,
): Promise<VersionHistoryEntry[]> {
  // Lecture ciblée : le snapshot complet (document entier) n'est pas chargé.
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      versionNumber: number;
      label: string | null;
      createdAt: Date;
      approvedBy: string | null;
      approvedAt: string | null;
      signedBy: string | null;
      signedAt: string | null;
      signedEmail: string | null;
    }>
  >(Prisma.sql`
    SELECT "id", "versionNumber", "label", "createdAt",
      "snapshot"->>'approvedBy' AS "approvedBy",
      "snapshot"->>'approvedAt' AS "approvedAt",
      "snapshot"->>'signedBy' AS "signedBy",
      "snapshot"->>'signedAt' AS "signedAt",
      "snapshot"->>'signedEmail' AS "signedEmail"
    FROM "ProjectVersion"
    WHERE "projectId" = ${projectId}
    ORDER BY "versionNumber" DESC
  `);

  const [refusals, reopenings] = await Promise.all([
    prisma.projectComment.findMany({
      where: { projectId, contenu: { startsWith: REFUSAL_PREFIX } },
      select: {
        contenu: true,
        createdAt: true,
        clientUser: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.auditLog.findMany({
      where: { projectId, action: 'REVIEW_RETURNED' },
      select: {
        createdAt: true,
        metadata: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const name = (person: { firstName?: string | null; lastName?: string | null } | null | undefined) =>
    person ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || null : null;

  // rows : du plus récent au plus ancien ; une décision appartient à la
  // version en vigueur au moment où elle a été prise.
  return rows.map((row, index) => {
    const start = new Date(row.createdAt).getTime();
    const next = index > 0 ? new Date(rows[index - 1].createdAt).getTime() : Infinity;
    const inWindow = (date: Date) => {
      const t = new Date(date).getTime();
      return t >= start && t < next;
    };
    const refusal = refusals.find((c) => inWindow(c.createdAt));
    const reopening = reopenings.find(
      (a) => inWindow(a.createdAt) && (a.metadata as any)?.previousStatus !== 'REVIEW',
    );
    let decision: VersionHistoryEntry['decision'] = null;
    if (refusal) {
      decision = {
        type: 'CLIENT_REFUSED',
        by: name(refusal.clientUser),
        at: refusal.createdAt,
        reason: String(refusal.contenu).slice(REFUSAL_PREFIX.length).trim(),
      };
    } else if (reopening) {
      decision = {
        type: 'REOPENED',
        by: name(reopening.user),
        at: reopening.createdAt,
        reason: String((reopening.metadata as any)?.reason ?? ''),
      };
    }
    const status: VersionHistoryEntry['status'] = row.signedAt
      ? 'SIGNED'
      : decision?.type === 'CLIENT_REFUSED'
        ? 'REFUSED'
        : decision
          ? 'REOPENED'
          : 'AWAITING_SIGNATURE';
    return {
      id: row.id,
      versionNumber: Number(row.versionNumber),
      label: row.label || `v${row.versionNumber}`,
      createdAt: row.createdAt,
      approvedBy: row.approvedBy,
      approvedAt: row.approvedAt,
      signedBy: row.signedBy,
      signedAt: row.signedAt,
      signedEmail: row.signedEmail,
      decision,
      status,
    };
  });
}
