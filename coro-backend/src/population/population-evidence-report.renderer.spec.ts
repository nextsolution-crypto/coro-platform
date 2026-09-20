import { PDFDocument } from 'pdf-lib';
import { buildPopulationEvidenceReportText, cleanEvidenceText, PopulationEvidenceReportRenderer } from './population-evidence-report.renderer';

const communication = (sequence: number, type: string) => ({
  id: `alert-${sequence}`, cycleSequence: sequence, type, status: 'ACTIVE', deliveryMode: 'LIVE',
  content: { titleFR: `Titre ${sequence}`, titleEN: 'English title', messageFR: `Message ${sequence}`, messageEN: 'English message', instructionFR: "Mise a l'abri", instructionEN: 'Shelter in place', materializedVariants: [{ channel: 'EMAIL', language: 'FR', message: `Message ${sequence}` }] },
  timestamps: { createdAt: '2026-09-20T14:00:00.000Z', readyAt: '2026-09-20T14:01:00.000Z', approvedAt: '2026-09-20T14:02:00.000Z', recipientsFrozenAt: '2026-09-20T14:03:00.000Z', activatedAt: '2026-09-20T14:04:00.000Z', endedAt: null },
  actors: { createdBy: { displayName: 'Operateur A', role: 'Gestionnaire' }, readyBy: null, approvedBy: { displayName: 'Operateur B', role: 'Approbateur' }, frozenBy: null, sentBy: { displayName: 'Operateur C', role: 'Diffuseur' } },
  zones: [{ code: 'A', nameFR: 'Zone A', maxDistanceKm: 1, protectiveAction: 'SHELTER_IN_PLACE', targetedSubscriberCount: 1, geometry: { present: true, sha256: 'a'.repeat(64) } }],
  targeting: { currentZoneSubscriberCount: 1, historicalSubscriberCount: 1, overlapSubscriberCount: 1, uniqueTargetCount: 1, revalidationSuppressedSubscriberCount: 0, deliverableSubscriberCount: 1 },
  deliverySummary: { emailCount: 1, smsCount: 0, materialized: 1, deliverable: 1, sent: 0, delivered: 1, failed: 0, suppressed: 0, outcomeUnknown: 0, retryPending: 0 },
  providerSummary: { counts: { ACCEPTED: 1, DELIVERED: 1, FAILED: 0, BOUNCE: 0 }, firstProviderOccurredAt: '2026-09-20T14:05:00.000Z', lastProviderOccurredAt: '2026-09-20T14:06:00.000Z' },
});
const input: any = {
  evidence: { id: 'evidence-safe-id', reference: 'CORO-SP-2026-000001', version: 1, schemaVersion: 'population-evidence/v1', status: 'FINALIZED', generatedAt: new Date('2026-09-20T15:00:00Z'), generatedByType: 'CLIENT_USER', snapshotSha256: '1'.repeat(64), snapshot: {
    organization: { name: 'CORO Validation' }, building: { name: 'Installation industrielle', address: '100 rue Test', city: 'Boucherville', province: 'QC', postalCode: 'J4B 1A1' }, program: { publicSlug: 'validation', deliveryMode: 'LIVE' }, scenario: { nameFR: 'Scenario validation' },
    event: { id: 'event-safe-id', startedAt: '2026-09-20T14:00:00Z', endedAt: '2026-09-20T16:00:00Z', startedBy: { displayName: 'Operateur A', role: 'Gestionnaire' }, endedBy: { displayName: 'Operateur C', role: 'Gestionnaire' } },
    communications: [communication(1, 'TEST'), communication(2, 'UPDATE'), communication(3, 'ALL_CLEAR')],
    summary: { communicationCount: 3, deliveryCount: 3, delivered: 3, failed: 0, suppressed: 0, outcomeUnknown: 0, retryPending: 0, completionStatus: 'COMPLETE' },
    closure: { endedAt: '2026-09-20T16:00:00Z', endedBy: { displayName: 'Operateur C', role: 'Gestionnaire' }, closeReason: null },
  } },
  manifestRecord: { id: 'manifest-safe-id', schemaVersion: 'population-evidence-manifest/v1', version: 1, manifestSha256: '2'.repeat(64), manifest: { canonicalization: 'CORO-CANONICAL-JSON-V1', integrity: { algorithm: 'SHA-256' }, components: { eventSha256: '3'.repeat(64), communicationsSha256: '4'.repeat(64), deliverySummarySha256: '5'.repeat(64), providerEvidenceSha256: '6'.repeat(64) } } },
  verification: { status: 'VERIFIED', verifiedAt: '2026-09-20T17:00:00Z' }, reportGeneratedAt: new Date('2026-09-20T17:00:00Z'),
};

describe('PopulationEvidenceReportRenderer', () => {
  it('préserve Unicode tout en retirant uniquement les caractères de contrôle', () => {
    const unicode = 'Référence — Bâtiment — Événement — Intégrité — Créée — Prête — Approuvée — Clôture';
    expect(cleanEvidenceText(`${unicode}\u0000`)).toBe(unicode);
  });

  it('distingue personnes admissibles et communications matérialisées lorsque le ciblage historique est absent', () => {
    const historical = structuredClone(input);
    delete historical.evidence.snapshot.communications[0].targeting.deliverableSubscriberCount;
    const text = buildPopulationEvidenceReportText(historical).join('\n');
    expect(text).toContain('Personnes uniques ciblées : 1');
    expect(text).toContain('Personnes admissibles après revalidation : Non disponible');
    expect(text).toContain('Communications admissibles matérialisées : 1');
  });
  it('produit un PDF A4 pagine valide', async () => {
    const bytes = await new PopulationEvidenceReportRenderer().render(input);
    expect(bytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    for (const page of pdf.getPages()) { expect(page.getWidth()).toBeCloseTo(595.28, 1); expect(page.getHeight()).toBeCloseTo(841.89, 1); }
  });

  it('construit le contenu documentaire complet sans PII ni camelCase brut', () => {
    const text = buildPopulationEvidenceReportText(input).join('\n');
    for (const expected of ['CORO-SP-2026-000001', 'CORO Validation', 'Installation industrielle', 'Scenario validation', '3 communications', 'livraison confirmée', "Fin d'alerte", "Mise à l'abri", 'Complet', 'INTÉGRITÉ', 'Vérifiée', 'Référence', 'Bâtiment', 'ÉVÉNEMENT', 'Créée', 'Prête', 'Approuvée', '1'.repeat(64), '6'.repeat(64), 'Page']) {
      if (expected !== 'Page') expect(text).toContain(expected);
    }
    for (const forbidden of ['subscriberId', 'providerMessageId', 'providerIdempotencyKey', 'clientIntentId', 'providerCallStartedAt', 'latitude', 'longitude', 'digitaloceanspaces.com']) expect(text).not.toContain(forbidden);
    for (const raw of ['uniqueTargetCount', 'outcomeUnknown', 'retryPending']) expect(text).not.toContain(raw);
  });
});
