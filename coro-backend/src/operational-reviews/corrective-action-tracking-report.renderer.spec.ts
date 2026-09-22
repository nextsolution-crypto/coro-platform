import { PDFDocument } from 'pdf-lib';
import { buildTrackingReportLines, CorrectiveActionTrackingReportRenderer, CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION, formatDateOnlyFr, trackingKpis, TrackingAction, TrackingRenderData } from './corrective-action-tracking-report.renderer';

const meta = { reportVersion: 1, generatedAt: '2026-09-22T03:00:00.000Z', generatorVersion: CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION, generatedByType: 'CLIENT_USER' };
const action = (status: string): TrackingAction => ({
  reference: 'AC-2026-000001', title: 'Sécurité — évacuation', description: 'Description avec é è à ç œ É et l’apostrophe typographique.', priority: 'CRITICAL', status,
  source: { findingDisplayOrder: 3, findingTitle: 'Constat', recommendationDisplayOrder: 1, recommendationTitle: 'Recommandation', recommendationDecision: 'ACCEPTED' },
  assigneeType: 'CLIENT_USER', assigneeDisplayName: 'Marie Test', dueDate: '2026-10-01T00:00:00.000Z', createdAt: '2026-09-21T00:00:00.000Z',
  completedAt: status === 'CLOSED' ? '2026-09-22T00:00:00.000Z' : null, verifiedAt: status === 'CLOSED' ? '2026-09-22T01:00:00.000Z' : null,
  closedAt: status === 'CLOSED' ? '2026-09-22T02:00:00.000Z' : null, completionComment: null, closureComment: status === 'CLOSED' ? 'Fin de suivi' : null,
  withdrawnEvidenceCount: 1, evidence: [
    { type: 'NOTE', title: 'Note active', submittedAt: '2026-09-21T01:00:00.000Z', fileSize: null, sha256: null },
    { type: 'LINK', title: 'Lien', submittedAt: '2026-09-21T01:00:00.000Z', fileSize: null, sha256: null },
    { type: 'DOCUMENT', title: 'preuve.pdf', submittedAt: '2026-09-21T01:00:00.000Z', fileSize: 2048, sha256: 'a'.repeat(64) },
  ],
  verifications: [
    { attemptNumber: 2, verdict: 'ACCEPTED', comment: 'Conforme', verifiedAt: '2026-09-22T01:00:00.000Z', actorType: 'CLIENT_USER' },
    { attemptNumber: 1, verdict: 'REJECTED', comment: 'À reprendre', verifiedAt: '2026-09-21T03:00:00.000Z', actorType: 'CLIENT_USER' },
  ],
});
const data = (actions: TrackingAction[]): TrackingRenderData => ({ schemaVersion: 1, snapshotAt: '2026-09-22T02:30:00.000Z', review: {
  reference: 'REX-2026-000001', version: 1, title: 'Retour d’expérience', confidentiality: 'BUILDING_TEAM', finalizedAt: '2026-09-21T00:00:00.000Z', sourceType: 'POPULATION', organizationNameAtSnapshot: 'CORO Validation', buildingNameAtSnapshot: 'Installation École',
}, actions });

describe('CorrectiveActionTrackingReportRenderer', () => {
  it('préserve la date métier sans décalage de fuseau ni heure', () => {
    expect(formatDateOnlyFr('2026-09-25T00:00:00.000Z')).toBe('25 septembre 2026');
    expect(formatDateOnlyFr('2026-01-01T00:00:00.000Z')).toBe('1 janvier 2026');
    expect(formatDateOnlyFr('2028-02-29T00:00:00.000Z')).toBe('29 février 2028');
    expect(formatDateOnlyFr(null)).toBe('Non renseignée');
    expect(formatDateOnlyFr(undefined)).toBe('Non renseignée');
    expect(formatDateOnlyFr('2026-02-30T00:00:00.000Z')).toBe('Non renseignée');
    expect(formatDateOnlyFr('unexpected')).toBe('Non renseignée');
  });

  it('rend les deux échéances date-only sans changer les vrais timestamps UTC', () => {
    const current = action('CLOSED');
    current.dueDate = '2026-09-25T00:00:00.000Z';
    const lines = buildTrackingReportLines(data([current]), meta).map((entry) => entry.text);
    expect(lines.filter((text) => text === 'Échéance : 25 septembre 2026')).toHaveLength(2);
    expect(lines.join('\n')).not.toContain('Échéance : 25 septembre 2026 à 00 h 00 UTC');
    expect(lines.join('\n')).toContain('Créée le : 21 septembre 2026 à 00 h 00 UTC');
    expect(lines.join('\n')).toContain('Situation au : 22 septembre 2026 à 02 h 30 UTC');
    expect(lines.join('\n')).toContain(CORRECTIVE_ACTION_TRACKING_REPORT_GENERATOR_VERSION);
  });
  it('calcule les KPI depuis le snapshot, y compris zero applicable', () => {
    expect(trackingKpis(data(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'].map(action)))).toMatchObject({ total: 6, planned: 1, inProgress: 1, completed: 1, verified: 1, closed: 1, cancelled: 1, applicable: 5, closureRate: 20 });
    expect(trackingKpis(data([])).closureRate).toBeNull();
    expect(trackingKpis(data([action('CANCELLED')])).closureRate).toBeNull();
  });

  it('refuse un statut ou verdict inconnu au lieu de produire un total trompeur', () => {
    expect(() => trackingKpis(data([{ ...action('PLANNED'), status: 'UNKNOWN' }]))).toThrow('TRACKING_SNAPSHOT_UNSUPPORTED');
    expect(() => buildTrackingReportLines(data([{ ...action('PLANNED'), verifications: [{ ...action('PLANNED').verifications[0], verdict: 'UNKNOWN' }] }]), meta)).toThrow('TRACKING_SNAPSHOT_UNSUPPORTED');
  });

  it('humanise les statuts et exclut contenu NOTE, URL LINK et IDs', () => {
    const lines = buildTrackingReportLines(data([action('IN_PROGRESS'), action('CLOSED'), action('CANCELLED')]), meta).map((entry) => entry.text).join('\n');
    expect(lines).toContain('Situation au');
    expect(lines).toContain('En cours');
    expect(lines).toContain('Fermée');
    expect(lines).toContain('Annulée');
    expect(lines).toContain('Tentative 1 — Rejetée');
    expect(lines).toContain('Tentative 2 — Acceptée');
    expect(lines).toContain('1 preuve retirée');
    expect(lines).not.toMatch(/OVERDUE|jours de retard|storageKey|actorId|noteText|externalUrl/);
  });

  it('produit un PDF A4 valide sans action et un taux non applicable', async () => {
    const bytes = await new CorrectiveActionTrackingReportRenderer().render(data([]), meta);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(2);
    expect(pdf.getPage(0).getSize().width).toBeCloseTo(595.28, 1);
    expect(pdf.getTitle()).toContain('Rapport de suivi des actions correctives');
    expect(buildTrackingReportLines(data([]), meta).map((item) => item.text).join(' ')).toContain('non applicable');
    expect(bytes.length).toBeLessThan(25 * 1024 * 1024);
  }, 15000);

  it('pagine 14 actions longues avec preuves et verifications', async () => {
    const actions = Array.from({ length: 14 }, (_, index) => ({ ...action(index % 2 ? 'CLOSED' : 'IN_PROGRESS'), reference: `AC-2026-${String(index + 1).padStart(6, '0')}`, description: 'Mesure corrective détaillée avec Unicode — '.repeat(85) }));
    const started = Date.now();
    const bytes = await new CorrectiveActionTrackingReportRenderer().render(data(actions), meta);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(5);
    expect(pdf.getPageCount()).toBeLessThan(100);
    expect(bytes.length).toBeLessThan(25 * 1024 * 1024);
    expect(Date.now() - started).toBeLessThan(30000);
  }, 30000);
});
