import {
  CoroActorType,
  PopulationAlertStatus,
  PopulationAlertType,
  PopulationDeliveryMode,
  PopulationDeliveryProviderEventType,
  PopulationDeliveryStatus,
  PopulationOperationalEventStatus,
} from '@prisma/client';
import {
  canonicalizeEvidence,
  buildEvidenceManifestV1,
  deriveEvidenceCompletionStatus,
  evidenceComponentHashes,
  hashEvidenceSnapshot,
  POPULATION_EVIDENCE_MANIFEST_SCHEMA_VERSION,
  POPULATION_EVIDENCE_SCHEMA_VERSION,
  PopulationEvidenceService,
  verifyEvidenceIntegrity,
} from './population-evidence.service';

const forbiddenKeys = new Set([
  'subscriberId',
  'email',
  'phone',
  'destinationSnapshot',
  'latitude',
  'longitude',
  'locationSnapshot',
  'providerMessageId',
  'providerIdempotencyKey',
  'clientIntentId',
  'providerCallStartedAt',
  'claimedAt',
  'leaseExpiresAt',
  'payloadFingerprint',
]);

function scanForbidden(value: unknown, path = 'snapshot'): string[] {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => scanForbidden(item, `${path}[${index}]`));
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => [
      ...(forbiddenKeys.has(key) ? [`${path}.${key}`] : []),
      ...scanForbidden(child, `${path}.${key}`),
    ],
  );
}

describe('PopulationEvidenceService', () => {
  it('canonicalise le même contenu logique de manière identique', () => {
    const left = { z: [3, { b: true, a: 'é' }], a: null };
    const right = { a: null, z: [3, { a: 'é', b: true }] };
    expect(canonicalizeEvidence(left)).toBe(canonicalizeEvidence(right));
    expect(hashEvidenceSnapshot(left)).toBe(hashEvidenceSnapshot(right));
    expect(hashEvidenceSnapshot(left)).toMatch(/^[a-f0-9]{64}$/);
  });

  describe('manifest et vérification', () => {
    const generatedAt = new Date('2026-09-20T15:00:00.000Z');
    const snapshot = {
      schemaVersion: POPULATION_EVIDENCE_SCHEMA_VERSION,
      event: { id: 'event-1', status: 'ENDED' },
      closure: { endedAt: '2026-09-20T14:59:00.000Z' },
      communications: [
        {
          id: 'alert-1',
          cycleSequence: 1,
          deliverySummary: { delivered: 1 },
          providerSummary: { counts: { DELIVERED: 1 } },
        },
      ],
      summary: { communicationCount: 1, delivered: 1 },
    };
    const evidence = {
      id: 'evidence-1',
      reference: 'CORO-SP-2026-000001',
      version: 1,
      schemaVersion: POPULATION_EVIDENCE_SCHEMA_VERSION,
      snapshot,
      snapshotSha256: hashEvidenceSnapshot(snapshot),
    };

    const record = (manifest: unknown, manifestSha256 = hashEvidenceSnapshot(manifest)) => ({
      schemaVersion: POPULATION_EVIDENCE_MANIFEST_SCHEMA_VERSION,
      version: 1,
      manifest,
      manifestSha256,
    });

    it('construit les component hashes exclusivement depuis le snapshot', () => {
      const hashes = evidenceComponentHashes(snapshot);
      expect(Object.keys(hashes)).toEqual([
        'eventSha256',
        'communicationsSha256',
        'deliverySummarySha256',
        'providerEvidenceSha256',
      ]);
      expect(Object.values(hashes)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^[a-f0-9]{64}$/)]),
      );
    });

    it('retourne VERIFIED lorsque toute la chaîne correspond', () => {
      const manifest = buildEvidenceManifestV1(evidence, generatedAt);
      expect(verifyEvidenceIntegrity(evidence, record(manifest), generatedAt)).toMatchObject({
        status: 'VERIFIED',
        snapshot: true,
        manifest: true,
        components: {
          event: true,
          communications: true,
          deliveries: true,
          providerEvidence: true,
        },
      });
      expect(scanForbidden(manifest)).toEqual([]);
    });

    it('détecte un snapshot altéré', () => {
      const manifest = buildEvidenceManifestV1(evidence, generatedAt);
      const tampered = {
        ...evidence,
        snapshot: { ...snapshot, event: { id: 'event-1', status: 'ACTIVE' } },
      };
      expect(verifyEvidenceIntegrity(tampered, record(manifest), generatedAt)).toMatchObject({
        status: 'MISMATCH',
        snapshot: false,
        components: { event: false },
      });
    });

    it('détecte un manifest ou son hash de composant altéré', () => {
      const manifest = buildEvidenceManifestV1(evidence, generatedAt);
      const alteredManifest = { ...manifest, reference: 'CORO-SP-ALTERED' };
      expect(
        verifyEvidenceIntegrity(evidence, record(alteredManifest, hashEvidenceSnapshot(manifest)), generatedAt),
      ).toMatchObject({ status: 'MISMATCH', manifest: false });
      const alteredComponent = {
        ...manifest,
        components: { ...manifest.components, eventSha256: '0'.repeat(64) },
      };
      expect(
        verifyEvidenceIntegrity(evidence, record(alteredComponent), generatedAt),
      ).toMatchObject({
        status: 'MISMATCH',
        components: { event: false },
      });
    });

    it('retourne UNAVAILABLE sans manifest ou pour une version non supportée', () => {
      expect(verifyEvidenceIntegrity(evidence, null, generatedAt).status).toBe('UNAVAILABLE');
      const manifest = buildEvidenceManifestV1(evidence, generatedAt);
      expect(
        verifyEvidenceIntegrity(evidence, { ...record(manifest), version: 2 }, generatedAt).status,
      ).toBe('UNAVAILABLE');
    });

    it('refuse une evidence absente ou non FINALIZED', async () => {
      const transaction = async (source: any) => {
        const tx = {
          $executeRaw: jest.fn(),
          populationEvidenceRecord: { findFirst: jest.fn().mockResolvedValue(source) },
          populationEvidenceManifest: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
        };
        const service = new PopulationEvidenceService({
          $transaction: (callback: any) => callback(tx),
        } as any);
        return { service, tx };
      };
      const missing = await transaction(null);
      await expect(
        missing.service.generateManifestV1('building-1', 'org-1', 'missing', {
          type: CoroActorType.SYSTEM,
          id: 'test',
        }),
      ).rejects.toThrow('introuvable');
      const nonFinal = await transaction({
        ...evidence,
        organizationId: 'org-1',
        buildingId: 'building-1',
        programId: 'program-1',
        operationalEventId: 'event-1',
        status: 'SUPERSEDED',
      });
      await expect(
        nonFinal.service.generateManifestV1('building-1', 'org-1', evidence.id, {
          type: CoroActorType.SYSTEM,
          id: 'test',
        }),
      ).rejects.toThrow('ne peut pas recevoir');
      expect(nonFinal.tx.populationEvidenceManifest.create).not.toHaveBeenCalled();
    });
  });

  it('construit un snapshot nominal ordonné sans PII ni identifiants transport', async () => {
    const prisma: any = {};
    const service = new PopulationEvidenceService(prisma);
    const tx: any = {
      clientUser: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'operator-1', firstName: 'Martin', lastName: 'Gagnon', role: 'CLIENT_MANAGER' },
        ]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const at = new Date('2026-09-20T14:54:29.000Z');
    const makeAlert = (sequence: number, type: PopulationAlertType) => ({
      id: `alert-${sequence}`,
      cycleSequence: sequence,
      type,
      status: PopulationAlertStatus.ACTIVE,
      deliveryModeSnapshot: PopulationDeliveryMode.LIVE,
      titleFR: `Titre ${sequence}`,
      titleEN: `Title ${sequence}`,
      messageFR: `Message ${sequence}`,
      messageEN: `Message EN ${sequence}`,
      instructionFR: null,
      instructionEN: null,
      createdAt: at,
      readyAt: at,
      approvedAt: at,
      recipientsFrozenAt: at,
      sendingAt: at,
      activatedAt: at,
      endedAt: null,
      createdByType: CoroActorType.CLIENT_USER,
      createdById: 'operator-1',
      readyByType: CoroActorType.CLIENT_USER,
      readyById: 'operator-1',
      approvedByType: CoroActorType.CLIENT_USER,
      approvedById: 'operator-1',
      frozenByType: CoroActorType.CLIENT_USER,
      frozenById: 'operator-1',
      sentByType: CoroActorType.CLIENT_USER,
      sentById: 'operator-1',
      endedByType: null,
      endedById: null,
      contextSnapshot: {
        population: { uniqueTargetCount: 1, subscriberIds: ['forbidden'] },
        targeting: { strategy: 'CURRENT', deliverableSubscriberCount: 1 },
      },
      zones: [
        {
          zoneCodeSnapshot: 'A',
          zoneNameFRSnapshot: 'Zone A',
          zoneNameENSnapshot: null,
          geometrySnapshot: { type: 'Polygon', coordinates: [[[0, 0]]] },
          maxDistanceKmSnapshot: 1,
          protectiveActionSnapshot: 'SHELTER_IN_PLACE',
          targetedSubscriberCount: 1,
        },
      ],
      deliveries: [
        {
          id: `delivery-${sequence}`,
          channel: 'EMAIL',
          language: 'FR',
          messageSnapshot: `Message ${sequence}`,
          status: PopulationDeliveryStatus.DELIVERED,
          attemptCount: 1,
          outcomeUnknownAt: null,
          nextAttemptAt: null,
          destinationSnapshot: 'citizen@example.invalid',
          subscriberId: 'citizen-1',
          providerMessageId: 'provider-secret',
          providerEvents: [
            {
              eventType: PopulationDeliveryProviderEventType.DELIVERED,
              providerOccurredAt: at,
              receivedAt: at,
              providerMessageId: 'provider-secret',
            },
          ],
        },
      ],
    });
    const event: any = {
      id: 'event-1',
      organizationId: 'org-1',
      programId: 'program-1',
      status: PopulationOperationalEventStatus.ENDED,
      incidentEventId: null,
      startedAt: at,
      endedAt: at,
      closeReason: null,
      startedByType: CoroActorType.CLIENT_USER,
      startedById: 'operator-1',
      endedByType: CoroActorType.CLIENT_USER,
      endedById: 'operator-1',
      organization: { id: 'org-1', name: 'CORO Validation' },
      program: {
        id: 'program-1',
        publicSlug: 'validation',
        status: 'ACTIVE',
        deliveryMode: 'LIVE',
        governanceMode: 'STANDARD',
        registrationEnabled: true,
        emailEnabled: true,
        smsEnabled: false,
        rueFacilityProfile: {
          building: {
            id: 'building-1',
            name: 'Installation validation',
            address: 'Adresse publique',
            city: 'Boucherville',
            province: 'QC',
            postalCode: null,
            buildingType: 'INDUSTRIAL',
          },
        },
      },
      emergencyScenario: {
        id: 'scenario-1',
        nameFR: 'Test',
        nameEN: 'Test',
        description: null,
        type: 'OTHER',
        eventType: null,
        releaseDescription: null,
        potentialEffects: null,
        impactDistanceKm: 1,
        impactMethod: null,
        defaultProtectiveAction: 'SHELTER_IN_PLACE',
      },
      alerts: [
        makeAlert(1, PopulationAlertType.TEST),
        makeAlert(2, PopulationAlertType.UPDATE),
        makeAlert(3, PopulationAlertType.ALL_CLEAR),
      ],
    };
    const snapshot = await (service as any).buildSnapshot(
      tx,
      event,
      'CORO-SP-2026-000001',
      at,
    );
    expect(snapshot.summary).toMatchObject({
      communicationCount: 3,
      deliveryCount: 3,
      delivered: 3,
      completionStatus: 'COMPLETE',
    });
    expect(snapshot.communications.map((item: any) => item.cycleSequence)).toEqual([1, 2, 3]);
    expect(snapshot.communications[0].actors.endedBy).toBeNull();
    expect(snapshot.communications[0].zones[0].geometry).toMatchObject({
      classification: 'RESTRICTED_INDUSTRIAL_IMPACT_ZONE',
      present: true,
    });
    expect(scanForbidden(snapshot)).toEqual([]);
  });

  it.each([
    [{ hasAllClear: true }, 'COMPLETE'],
    [{ hasAllClear: true, failed: 1 }, 'COMPLETE_WITH_EXCEPTIONS'],
    [{ hasAllClear: true, closeReason: 'Clôture forcée' }, 'COMPLETE_WITH_EXCEPTIONS'],
    [{ hasAllClear: false }, 'INCOMPLETE'],
    [{ hasAllClear: true, outcomeUnknown: 1 }, 'INCOMPLETE'],
    [{ hasAllClear: true, queued: 1 }, 'INCOMPLETE'],
  ])('calcule le statut descriptif %s', (partial, expected) => {
    const input = partial as Partial<
      Parameters<typeof deriveEvidenceCompletionStatus>[0]
    >;
    expect(
      deriveEvidenceCompletionStatus({
        hasAllClear: input.hasAllClear ?? false,
        outcomeUnknown: input.outcomeUnknown ?? 0,
        retryPending: 0,
        queued: input.queued ?? 0,
        sending: 0,
        failed: input.failed ?? 0,
        suppressed: 0,
        cancelled: 0,
        closeReason: input.closeReason ?? null,
      }),
    ).toBe(expected);
  });
});
