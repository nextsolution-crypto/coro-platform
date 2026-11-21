/** Tampon d'approbation imprimé sur le PDF officiel (audit M1-05). */
export interface ApprovalStamp {
  versionNumber: number;
  approvedAt: string | null;
  approvedBy: string | null;
  contentHash: string;
}

export function approvalStampFromVersion(version: {
  versionNumber: number;
  snapshot: unknown;
}): ApprovalStamp | undefined {
  const snapshot = (version.snapshot as any) || {};
  if (snapshot.type !== 'APPROVAL' || typeof snapshot.contentHash !== 'string') {
    return undefined;
  }
  return {
    versionNumber: version.versionNumber,
    approvedAt: typeof snapshot.approvedAt === 'string' ? snapshot.approvedAt : null,
    approvedBy: typeof snapshot.approvedBy === 'string' && snapshot.approvedBy.trim()
      ? snapshot.approvedBy.trim()
      : null,
    contentHash: snapshot.contentHash,
  };
}

/** Empreinte courte lisible : 12 caractères en 3 groupes. */
export function shortContentHash(hash: string): string {
  const clean = hash.replace(/[^0-9a-f]/gi, '').slice(0, 12).toLowerCase();
  return clean.replace(/(.{4})(?=.)/g, '$1 ');
}
