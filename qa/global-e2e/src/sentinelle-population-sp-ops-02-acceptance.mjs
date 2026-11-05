#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { QaIdentityLab } from './browser-orchestration.mjs';
import { loadSecretStore } from './secret-store.mjs';
import { startMfaCaptureAdapter } from './mfa-capture-adapter.mjs';
import { assertDisposableDatabase } from './database-policy.mjs';
import { assertSafeEnvironment, assertUnderQaRoot } from './policy.mjs';

assertSafeEnvironment();
assertDisposableDatabase();

const repositoryRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const require = createRequire(join(repositoryRoot, 'coro-backend', 'package.json'));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const evidencePath = assertUnderQaRoot(
  process.env.CORO_QA_SP_OPS_02_EVIDENCE ||
    'D:\\CORO-QA\\tracking\\sentinelle-population\\sp-ops-02-integrated.json',
);
const ids = Object.freeze({
  orgA: '10000000-0000-4000-8000-000000000002',
  orgB: '10000000-0000-4000-8000-000000000003',
  buildingA: '40000000-0000-4000-8000-000000000001',
  localManager: '70000000-0000-4000-8000-000000000004',
  corporateA: '70000000-0000-4000-8000-000000000007',
  profile: '91000000-0000-4000-8000-000000000001',
  program: '91000000-0000-4000-8000-000000000002',
  scenario: '91000000-0000-4000-8000-000000000003',
  modeledZone: '91000000-0000-4000-8000-000000000004',
  operationalZone: '91000000-0000-4000-8000-000000000005',
  hospital: '91000000-0000-4000-8000-000000000006',
  school: '91000000-0000-4000-8000-000000000007',
  geometryOnly: '91000000-0000-4000-8000-000000000008',
  hospitalContact: '91000000-0000-4000-8000-000000000009',
  schoolContact: '91000000-0000-4000-8000-00000000000a',
  subscriber: '91000000-0000-4000-8000-00000000000b',
});
const report = {
  executedAt: new Date().toISOString(),
  candidate: process.env.CORO_QA_COMMIT_SHA || null,
  checks: [],
  mutations: [],
  providerMode: 'SIMULATED_AND_NETWORK_ISOLATED',
  browser: [],
};
const check = (id, pass, detail) => {
  report.checks.push({ id, status: pass ? 'PASS' : 'FAIL', detail });
  if (!pass) throw new Error(`${id}: ${detail}`);
};
const callOk = async (lab, route, options, expected, id) => {
  const result = await lab.call(route, options);
  check(id, expected.includes(result.status), `HTTP ${result.status}`);
  return result;
};

async function runBrowserAcceptance(manager) {
  const require = createRequire(join(repositoryRoot, 'coro-backend', 'package.json'));
  const puppeteer = require('puppeteer');
  const browserEvidenceRoot = assertUnderQaRoot(
    process.env.CORO_QA_SP_OPS_02_BROWSER_EVIDENCE ||
      'D:\\CORO-QA\\tracking\\sentinelle-population\\sp-ops-02-browser',
  );
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 2560, height: 1440 },
  ];
  // Cette route est explicitement `shell: none` dans le registre. Les trois
  // préférences doivent donc conserver l'interface Classic, en clair/sombre.
  const themes = [
    { name: 'classic-light', preference: 'LIGHT', expectedTheme: 'light' },
    { name: 'classic-dark', preference: 'DARK', expectedTheme: 'dark' },
    { name: 'classic-system-dark', preference: 'SYSTEM', expectedTheme: 'dark' },
  ];
  const consoleErrors = [];
  await mkdir(browserEvidenceRoot, { recursive: true });
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-dark-mode'],
  });
  try {
    for (const viewport of viewports) {
      for (const theme of themes) {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        const id = `${viewport.width}x${viewport.height}-${theme.name}`;
        page.on('console', (event) => {
          if (event.type() === 'error') consoleErrors.push(`${id}: ${event.text()}`);
        });
        page.on('pageerror', (error) => consoleErrors.push(`${id}: ${error.message}`));
        await page.setViewport(viewport);
        await page.emulateMediaFeatures([
          { name: 'prefers-color-scheme', value: theme.expectedTheme },
        ]);
        await page.evaluateOnNewDocument(({ token, user, preference }) => {
          localStorage.setItem('coro_client_token', token);
          localStorage.setItem('coro_client_user', JSON.stringify(user));
          localStorage.setItem('coro-ui-generation', 'legacy');
          localStorage.setItem('coro-theme-preference', preference);
        }, { token: manager.token, user: manager.user, preference: theme.preference });
        await page.goto(
          `${process.env.CORO_QA_PORTAL_URL}/sentinelle/${ids.buildingA}/population`,
          { waitUntil: 'domcontentloaded', timeout: 60_000 },
        );
        await page.waitForFunction(
          () => document.body.innerText.includes('Scénarios d’urgence'),
          { timeout: 30_000 },
        );
        const state = await page.evaluate(() => {
          const controls = [...document.querySelectorAll('button, a, input')]
            .filter((node) => {
              const box = node.getBoundingClientRect();
              return box.width > 0 && box.height > 0;
            })
            .map((node) => {
              const box = node.getBoundingClientRect();
              return { left: box.left, right: box.right };
            });
          return {
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            outside: controls.filter((box) => box.left < -1 || box.right > innerWidth + 1).length,
            ui: document.documentElement.dataset.ui,
            theme: document.documentElement.dataset.theme,
            text: document.body.innerText,
          };
        });
        const pass = !state.overflow && state.outside === 0 && state.ui === 'legacy' &&
          state.theme === theme.expectedTheme && state.text.includes('EXERCICE — rejet synthétique');
        report.browser.push({ id, status: pass ? 'PASS' : 'FAIL', ...state, text: undefined });
        await page.screenshot({ path: join(browserEvidenceRoot, `${id}.png`), fullPage: true });

        if (viewport.width === 1440 && theme.name === 'classic-light') {
          const clickText = async (needle) => page.evaluate((label) => {
            const button = [...document.querySelectorAll('button')]
              .find((item) => item.textContent?.includes(label) && !item.disabled);
            button?.click();
            return Boolean(button);
          }, needle);
          check('browser-scenario-select', await clickText('EXERCICE — rejet synthétique'), 'scenario control available');
          check('browser-preview-action', await clickText('Calculer la population ciblée'), 'preview action available');
          await page.waitForFunction(() => document.body.innerText.includes('Préparer l’alerte'), { timeout: 20_000 });
          check('browser-prepare-action', await clickText('Préparer l’alerte'), 'composer opened');
          await page.waitForFunction(() => document.body.innerText.includes('Qualifier la communication'), { timeout: 20_000 });
          await clickText('Continuer');
          await page.waitForFunction(() => document.body.innerText.includes('Confirmer le territoire ciblé'), { timeout: 20_000 });
          await clickText('Continuer');
          await page.waitForFunction(() => document.body.innerText.includes('Établissements sensibles dans le périmètre'), { timeout: 20_000 });
          const targeting = await page.evaluate(() => {
            const text = document.body.innerText;
            const heading = [...document.querySelectorAll('h3')].find((node) =>
              node.textContent?.includes('Établissements sensibles dans le périmètre'),
            );
            const section = heading?.parentElement;
            const boxes = [...(section?.querySelectorAll('input[type="checkbox"]') ?? [])];
            return {
              hospital: text.includes('Hôpital QA'),
              school: text.includes('École QA'),
              geometryOnlyAbsent: !text.includes('Géométrie sans coordonnées QA'),
              count: boxes.length,
              unchecked: boxes.every((box) => !box.checked),
              selectable: boxes.filter((box) => !box.disabled).length,
            };
          });
          check('browser-sensitive-assets', targeting.hospital && targeting.school && targeting.geometryOnlyAbsent, JSON.stringify(targeting));
          check('browser-no-auto-selection', targeting.count === 2 && targeting.unchecked && targeting.selectable === 2, JSON.stringify(targeting));
          await page.screenshot({ path: join(browserEvidenceRoot, 'targeting-step-desktop.png'), fullPage: true });
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  check('browser-matrix-12-of-12', report.browser.length === 12 && report.browser.every((entry) => entry.status === 'PASS'), `${report.browser.filter((entry) => entry.status === 'PASS').length}/12`);
  check('browser-console', consoleErrors.length === 0, JSON.stringify(consoleErrors));
}

async function seedFoundation() {
  const now = new Date();
  await prisma.building.update({
    where: { id: ids.buildingA },
    data: { latitude: 45.5, longitude: -73.5 },
  });
  await prisma.clientUser.update({
    where: { id: ids.localManager },
    data: {
      populationPermissions: ['POPULATION_PREPARE', 'POPULATION_SEND'],
    },
  });
  await prisma.clientUser.update({
    where: { id: ids.corporateA },
    data: { populationPermissions: ['POPULATION_APPROVE'] },
  });
  await prisma.rueFacilityProfile.upsert({
    where: { buildingId: ids.buildingA },
    update: {
      assessmentStatus: 'CONFIRMED_SUBJECT',
      populationEnabled: true,
      assessedAt: now,
      assessedByType: 'SYSTEM',
      assessedById: 'sp-ops-02',
    },
    create: {
      id: ids.profile,
      buildingId: ids.buildingA,
      assessmentStatus: 'CONFIRMED_SUBJECT',
      assessmentSource: 'MANUAL',
      populationEnabled: true,
      assessedAt: now,
      assessedByType: 'SYSTEM',
      assessedById: 'sp-ops-02',
      assessmentReference: 'QA-SP-OPS-02',
    },
  });
  const profile = await prisma.rueFacilityProfile.findUniqueOrThrow({
    where: { buildingId: ids.buildingA },
  });
  await prisma.populationProgram.upsert({
    where: { rueFacilityProfileId: profile.id },
    update: {
      status: 'ACTIVE', deliveryMode: 'SANDBOX', governanceMode: 'DUAL_CONTROL',
      registrationEnabled: false, smsEnabled: true, emailEnabled: true,
    },
    create: {
      id: ids.program, rueFacilityProfileId: profile.id,
      status: 'ACTIVE', deliveryMode: 'SANDBOX', governanceMode: 'DUAL_CONTROL',
      publicSlug: 'sp-ops-02-synthetic', nameFR: 'SP-OPS-02 synthétique',
      registrationEnabled: false, smsEnabled: true, emailEnabled: true,
      consentVersion: 'qa-sp-ops-02', activatedAt: now,
    },
  });
  const program = await prisma.populationProgram.findUniqueOrThrow({
    where: { rueFacilityProfileId: profile.id },
  });
  await prisma.rueEmergencyScenario.upsert({
    where: { id: ids.scenario },
    update: { isActive: true, validatedAt: now, dispersionReviewedAt: now },
    create: {
      id: ids.scenario, facilityProfileId: profile.id,
      nameFR: 'EXERCICE — rejet synthétique', nameEN: 'EXERCISE — synthetic release',
      type: 'WORST_CASE', eventType: 'SYNTHETIC_RELEASE',
      impactDistanceKm: 4.85485, impactMethod: 'Rapport synthétique QA',
      dispersionModelName: 'SyntheticModel', dispersionModelVersion: 'QA-1',
      dispersionStudyTitle: 'Étude synthétique SP-OPS-02',
      dispersionStudyReference: 'QA-SP-OPS-02', dispersionStudyDate: now,
      toxicEndpointName: 'AEGL-2', toxicEndpointConcentrationPpm: 160,
      toxicEndpointAveragingTimeSeconds: 3600, windSpeedMetersPerSecond: 1.5,
      atmosphericStabilityClass: 'F', releaseDurationSeconds: 600,
      receptorHeightMeters: 1.7,
      dispersionAssumptions: 'Données synthétiques inspirées du format du rapport; aucun calcul scientifique CORO.',
      dispersionLimitations: 'Simulation QA uniquement.',
      dispersionReviewedAt: now, dispersionReviewedByType: 'SYSTEM',
      dispersionReviewedById: 'sp-ops-02', defaultProtectiveAction: 'SHELTER_IN_PLACE',
      publicInstructionFR: 'EXERCICE — Mettez-vous à l’abri.',
      publicInstructionEN: 'EXERCISE — Shelter in place.',
      source: 'IMPORT', sourceReference: 'QA-SP-OPS-02',
      validatedAt: now, validatedByType: 'SYSTEM', validatedById: 'sp-ops-02',
    },
  });
  for (const zone of [
    {
      id: ids.modeledZone, code: 'MODEL', nameFR: 'Empreinte modélisée',
      purpose: 'MODELED_IMPACT', maxDistanceKm: 0.2,
      approvedForAlerting: false,
    },
    {
      id: ids.operationalZone, code: 'OP', nameFR: 'Zone opérationnelle approuvée',
      purpose: 'PUBLIC_NOTIFICATION', maxDistanceKm: 5,
      approvedForAlerting: true,
    },
  ]) {
    await prisma.rueImpactZone.upsert({
      where: { scenarioId_code: { scenarioId: ids.scenario, code: zone.code } },
      update: {
        purpose: zone.purpose, maxDistanceKm: zone.maxDistanceKm,
        approvedForAlerting: zone.approvedForAlerting, isActive: true,
      },
      create: {
        ...zone, scenarioId: ids.scenario,
        protectiveAction: 'SHELTER_IN_PLACE',
        instructionFR: 'EXERCICE — Mettez-vous à l’abri.',
        determinationMethod: 'QA synthétique', sourceReference: 'QA-SP-OPS-02',
        source: 'MANUAL', validatedAt: now, validatedByType: 'SYSTEM',
        validatedById: 'sp-ops-02',
        alertingApprovedAt: zone.approvedForAlerting ? now : null,
        alertingApprovedByType: zone.approvedForAlerting ? 'SYSTEM' : null,
        alertingApprovedById: zone.approvedForAlerting ? 'sp-ops-02' : null,
      },
    });
  }
  const assets = [
    { id: ids.hospital, type: 'HOSPITAL', name: 'Hôpital QA', latitude: 45.51, longitude: -73.5, occupancy: 250 },
    { id: ids.school, type: 'SCHOOL', name: 'École QA', latitude: 45.52, longitude: -73.5, occupancy: 400 },
    { id: ids.geometryOnly, type: 'SENIORS_RESIDENCE', name: 'Résidence géométrie seulement', latitude: null, longitude: null, occupancy: 80 },
  ];
  for (const asset of assets) {
    await prisma.rueSurroundingAsset.upsert({
      where: { id: asset.id },
      update: { isActive: true },
      create: {
        id: asset.id, facilityProfileId: profile.id, type: asset.type,
        name: asset.name, latitude: asset.latitude, longitude: asset.longitude,
        geometry: asset.id === ids.geometryOnly ? { type: 'Polygon', coordinates: [] } : undefined,
        estimatedOccupancy: asset.occupancy, isSensitive: true,
        isCritical: asset.type === 'HOSPITAL', source: 'MANUAL',
        sourceReference: 'QA-SP-OPS-02', validatedAt: now,
        validatedByType: 'SYSTEM', validatedById: 'sp-ops-02',
      },
    });
  }
  for (const contact of [
    { id: ids.hospitalContact, assetId: ids.hospital, email: 'hospital@global-e2e.test' },
    { id: ids.schoolContact, assetId: ids.school, email: 'school@global-e2e.test' },
  ]) {
    await prisma.rueSurroundingAssetContact.upsert({
      where: { id: contact.id },
      update: { isActive: true },
      create: {
        id: contact.id, surroundingAssetId: contact.assetId,
        roleDescription: 'Urgence QA', email: contact.email,
        isPrimary: true, isEmergency: true, is24x7: true,
      },
    });
  }
  await prisma.populationSubscriber.upsert({
    where: { id: ids.subscriber },
    update: { status: 'ACTIVE' },
    create: {
      id: ids.subscriber, programId: program.id, status: 'ACTIVE',
      isSynthetic: true, preferredLanguage: 'FR',
      email: 'citizen@global-e2e.test', emailCanonical: 'citizen@global-e2e.test',
      emailEnabled: true, smsEnabled: false, latitude: 45.515, longitude: -73.5,
      identityAuthorityAt: now, verifiedAt: now, locationSource: 'QA_SYNTHETIC',
      locationResolvedAt: now,
    },
  });
  report.mutations.push('fixture-foundation-upserted');
  return { profile, program };
}

const secrets = await loadSecretStore();
const adapter = await startMfaCaptureAdapter({
  captureDirectory: process.env.CORO_QA_MFA_DIR,
  channelToken: secrets.mfaChannelToken,
});
const lab = new QaIdentityLab({
  apiUrl: process.env.CORO_QA_BACKEND_URL,
  portalUrl: process.env.CORO_QA_PORTAL_URL,
  frontendUrl: process.env.CORO_QA_PORTAL_URL,
  password: secrets.syntheticPassword,
  mfaAdapterUrl: adapter.url,
  mfaChannelToken: secrets.mfaChannelToken,
});

try {
  const { profile } = await seedFoundation();
  const manager = await lab.loginAs('clientLocalA');
  const approver = await lab.loginAs('clientCorporateA');
  const otherTenant = await lab.loginAs('clientOrganizationB');
  const interruptedEvent = await prisma.populationOperationalEvent.findFirst({
    where: {
      program: { rueFacilityProfileId: profile.id },
      emergencyScenarioId: ids.scenario,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
  });
  if (interruptedEvent) {
    await callOk(
      lab,
      `/client-portal/buildings/${ids.buildingA}/population/operational-events/${interruptedEvent.id}/close`,
      {
        method: 'POST', token: manager.token,
        body: {
          forceClose: true,
          confirmIncompleteDelivery: true,
          closeReason: 'Reprise idempotente de la simulation SP-OPS-02 interrompue; aucune urgence réelle.',
        },
      }, [200, 201], 'interrupted-simulation-reconciled',
    );
  }
  const preview = await callOk(
    lab,
    `/client-portal/buildings/${ids.buildingA}/population/scenarios/${ids.scenario}/preview`,
    { token: manager.token }, [200], 'preview-authorized',
  );
  const assets = preview.data?.sensitiveAssets ?? [];
  check('modeled-impact-excluded', preview.data?.zones?.length === 1 && preview.data.zones[0].code === 'OP', `zones=${preview.data?.zones?.map((z) => z.code).join(',')}`);
  check('sensitive-assets-geographic', assets.filter((a) => a.geographicallyConcerned).length === 2, `concerned=${assets.filter((a) => a.geographicallyConcerned).length}`);
  check('geometry-only-not-silently-computed', assets.some((a) => a.id === ids.geometryOnly && a.hasGeometry && !a.geographicallyConcerned), 'geometry-only retained but not centroid-targeted');
  check('no-auto-selection', assets.every((a) => !a.selectedForNotification), 'preview requires explicit selection');

  const crossTenant = await lab.call(
    `/client-portal/buildings/${ids.buildingA}/population/scenarios/${ids.scenario}/preview`,
    { token: otherTenant.token },
  );
  check('cross-tenant-denied', [403, 404].includes(crossTenant.status), `HTTP ${crossTenant.status}`);

  const draft = await callOk(
    lab,
    `/client-portal/buildings/${ids.buildingA}/population/alerts/draft`,
    {
      method: 'POST', token: manager.token,
      body: {
        scenarioId: ids.scenario, type: 'TEST', targetingMode: 'GLOBAL',
        targetingConfirmed: true,
        selectedSensitiveAssetIds: [ids.hospital, ids.school],
        titleFR: 'EXERCICE — Alerte synthétique SP-OPS-02',
        titleEN: 'EXERCISE — Synthetic SP-OPS-02 alert',
        messageFR: 'EXERCICE — Aucune urgence réelle. Mettez-vous à l’abri.',
        messageEN: 'EXERCISE — No real emergency. Shelter in place.',
        instructionFR: 'EXERCICE — Attendez les consignes.',
      },
    }, [201], 'draft-created',
  );
  const alertId = draft.data.id;
  check('institution-snapshots-created', draft.data.institutionTargets?.length === 2, `targets=${draft.data.institutionTargets?.length ?? 0}`);

  await callOk(lab, `/client-portal/buildings/${ids.buildingA}/population/alerts/${alertId}/ready`, { method: 'POST', token: manager.token, body: {} }, [201, 200], 'ready');
  const selfApproval = await lab.call(`/client-portal/buildings/${ids.buildingA}/population/alerts/${alertId}/approve`, { method: 'POST', token: manager.token, body: {} });
  check('dual-control-self-approval-denied', selfApproval.status === 400 || selfApproval.status === 403, `HTTP ${selfApproval.status}`);
  await callOk(lab, `/client-portal/buildings/${ids.buildingA}/population/alerts/${alertId}/approve`, { method: 'POST', token: approver.token, body: {} }, [201, 200], 'independent-approval');

  const freezes = await Promise.all([
    lab.call(`/client-portal/buildings/${ids.buildingA}/population/alerts/${alertId}/freeze-recipients`, { method: 'POST', token: manager.token, body: {} }),
    lab.call(`/client-portal/buildings/${ids.buildingA}/population/alerts/${alertId}/freeze-recipients`, { method: 'POST', token: manager.token, body: {} }),
  ]);
  check('concurrent-freeze-idempotent', freezes.every((result) => [200, 201].includes(result.status)), `statuses=${freezes.map((r) => r.status).join(',')}`);
  const deliveriesBeforeSend = await prisma.populationAlertDelivery.findMany({ where: { alertId } });
  check('institution-deliveries-suppressed', deliveriesBeforeSend.filter((d) => d.institutionTargetId).length === 2 && deliveriesBeforeSend.filter((d) => d.institutionTargetId).every((d) => d.status === 'SUPPRESSED' && d.destinationSnapshot === null), `institutionDeliveries=${deliveriesBeforeSend.filter((d) => d.institutionTargetId).length}`);
  check('no-freeze-duplicates', new Set(deliveriesBeforeSend.map((d) => d.idempotencyKey)).size === deliveriesBeforeSend.length, `deliveries=${deliveriesBeforeSend.length}`);

  await callOk(lab, `/client-portal/buildings/${ids.buildingA}/population/alerts/${alertId}/send`, { method: 'POST', token: manager.token, body: {} }, [200, 201], 'sandbox-send');
  const deliveryStatus = await callOk(lab, `/client-portal/buildings/${ids.buildingA}/population/alerts/${alertId}/delivery-status`, { token: manager.token }, [200], 'delivery-journal');
  check('simulation-no-provider', (await prisma.populationAlertDelivery.count({ where: { alertId, provider: { not: null } } })) === 0, 'provider fields remain empty');
  check('simulation-suppressed', deliveryStatus.data?.counts?.suppressed === deliveriesBeforeSend.length, `suppressed=${deliveryStatus.data?.counts?.suppressed}`);

  const event = await prisma.populationOperationalEvent.findFirstOrThrow({
    where: { program: { rueFacilityProfileId: profile.id }, emergencyScenarioId: ids.scenario },
    orderBy: { createdAt: 'desc' },
  });
  await callOk(
    lab,
    `/client-portal/buildings/${ids.buildingA}/population/operational-events/${event.id}/close`,
    {
      method: 'POST', token: manager.token,
      body: {
        forceClose: true,
        confirmIncompleteDelivery: true,
        closeReason: 'Clôture exceptionnelle de simulation SP-OPS-02; aucune urgence réelle.',
      },
    }, [200, 201], 'simulation-event-closed',
  );
  const evidence = await callOk(lab, `/client-portal/buildings/${ids.buildingA}/population/operational-events/${event.id}/evidence`, { method: 'POST', token: manager.token, body: {} }, [200, 201], 'simulation-evidence');
  await callOk(lab, `/client-portal/buildings/${ids.buildingA}/population/evidence/${evidence.data.id}/manifest`, { method: 'POST', token: manager.token, body: {} }, [200, 201], 'simulation-manifest');
  await callOk(lab, `/client-portal/buildings/${ids.buildingA}/population/evidence/${evidence.data.id}/report`, { method: 'POST', token: manager.token, body: {} }, [200, 201], 'simulation-report');

  await runBrowserAcceptance(manager);
  check('all-integrated-checks-pass', report.checks.every((entry) => entry.status === 'PASS'), `${report.checks.length} checks`);
} finally {
  await adapter.close();
  await prisma.$disconnect();
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, JSON.stringify(report, null, 2), { mode: 0o600 });
}

process.stdout.write(`${JSON.stringify({ status: report.checks.every((entry) => entry.status === 'PASS') ? 'PASS' : 'FAIL', checks: report.checks.length, evidence: evidencePath })}\n`);
