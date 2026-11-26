/**
 * Couverture configurateur PCA → document.
 * Liste des champs = ceux que l'écran du configurateur PCA permet de saisir
 * (coro-frontend/app/configurator/pca/[projectId]/page.tsx), avec les mêmes
 * valeurs d'options. Méthode : configuration complète, puis retrait d'un champ
 * à la fois ; si les modules PCA générés (FR + EN) ne changent pas, le champ
 * n'arrive pas jusqu'au PDF. Chaque option de liste est aussi essayée : elle
 * doit changer le document, et son code interne ne doit jamais s'y afficher.
 */
import { GeneratorService } from '../generator/generator.service';
import { generatePcaModules } from '../generator/pca.templates';
import { pcaOption } from '../generator/pca-display';

type Kind = 'text' | 'date' | 'number' | 'bool' | 'select' | 'multi' | 'list';
type Field = { key: string; kind: Kind; options?: string[]; items?: Field[] };

const t = (key: string): Field => ({ key, kind: 'text' });
const sel = (key: string, options: string[]): Field => ({ key, kind: 'select', options });
const bool = (key: string): Field => ({ key, kind: 'bool' });
const DUR = ['1h', '4h', '8h', '24h', '48h', '72h', '1sem'];
const EXERCISE = ['Annuel', 'Tous les 2 ans', 'Tous les 3 ans', 'Sur demande', 'Non prévu'];

const FIELDS: Field[] = [
  // Section 1
  t('planName'), { key: 'effectiveDate', kind: 'date' },
  sel('scope', ['ORGANIZATION', 'BUILDING', 'MULTI_BUILDING']),
  sel('sector', ['Manufacturier', 'Santé', 'Finance et assurances', 'Autre']),
  { key: 'employeeCount', kind: 'number' },
  sel('operatingHours', ['24/7', 'heures_bureau', 'heures_etendues', 'semaine_weekend', 'autre']),
  { key: 'regulatoryReqs', kind: 'multi', options: ['ISO 22301', 'BOMA BEST', 'AMF', 'OCRCVM', 'LEED', 'SQF', 'AS9100', 'IATF 16949', 'ZQREGX'] },
  // Section 2
  t('coordinatorFirstName'), t('coordinatorLastName'), t('coordinatorTitle'), t('coordinatorEmail'), t('coordinatorPhone'),
  t('substituteFirstName'), t('substituteLastName'), t('substituteEmail'), t('substitutePhone'),
  { key: 'cellMembers', kind: 'list', items: ['role', 'firstName', 'lastName', 'email', 'phone', 'responsibilities', 'alternate'].map(t) },
  t('spokesperson'), t('socialMediaMonitor'),
  // Section 3
  { key: 'riskScenarios', kind: 'list', items: [
    sel('probability', ['FAIBLE', 'MOYENNE', 'ELEVEE']), sel('impact', ['FAIBLE', 'MOYEN', 'ELEVE']),
    ...['customScenario', 'consequences', 'affectedActivities', 'dependencies', 'existingControls', 'riskOwner', 'treatmentActions', 'comments'].map(t),
  ] },
  // Section 4
  { key: 'criticalServices', kind: 'list', items: [
    t('name'), t('owner'), sel('recoveryPriority', ['CRITIQUE', 'ELEVEE', 'MOYENNE', 'FAIBLE']), t('minServiceLevel'),
    sel('rto', [...DUR, 'plus']), sel('rpo', ['0', '1h', '4h', '8h', '24h', '48h', '1sem']),
    sel('mad', ['4h', '8h', '24h', '48h', '72h', '1sem', '2sem', '1mois']),
    sel('financialImpact', ['moins_1k', '1k_10k', '10k_50k', '50k_100k', '100k_500k', 'plus_500k']),
    sel('reputationalImpact', ['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE']), bool('legalImpact'),
    ...['impact4h', 'impact24h', 'impact72h', 'impact7d'].map((k) => sel(k, ['NEGLIGEABLE', 'FAIBLE', 'MODERE', 'ELEVE', 'CRITIQUE'])),
    ...['internalDependencies', 'externalDependencies', 'singlePointsOfFailure', 'recoveryPrerequisites', 'criticalPeriods', 'degradedMode'].map(t),
    sel('degradedModeDuration', ['2h', '4h', '8h', '24h', '48h', '72h', '1sem', 'indefini']),
    ...['resourcePersonnel', 'resourceIT', 'resourceEquipment', 'resourceSuppliers', 'resourceSite', 'resourceEnergy'].map(t),
  ] },
  // Section 5
  sel('teleworkPossible', ['Oui', 'Partiel', 'Non']),
  bool('alternativeSite'), t('alternativeSiteAddress'), bool('sharingAgreement'), bool('itRedundancy'), bool('offSiteBackup'),
  sel('backupFrequency', ['temps_reel', 'horaire', 'quotidien', 'hebdo']),
  { key: 'criticalITSystems', kind: 'list', items: [t('name'), sel('rto', ['1h', '4h', '8h', '24h', '48h', '72h']), sel('rpo', ['0', '1h', '4h', '8h', '24h']), t('degradedMode'), t('backupSolution')] },
  bool('crossTraining'), bool('processDocumented'), bool('tempStaffAccess'),
  sel('absenteeismThreshold', ['15', '20', '25', '30', '40', '50', 'cle']),
  bool('alternativeSuppliers'), bool('safetyStock'), sel('safetyStockDuration', ['1sem', '2sem', '1mois', '3mois', '6mois']),
  { key: 'criticalSuppliers', kind: 'list', items: [
    t('name'), t('service'), sel('tolerance', DUR), t('preventiveMeasure'), t('backupSolution'),
    sel('activationDelay', ['immediate', '1h', '4h', '24h', '48h', '1sem']), sel('status', ['PRET', 'PARTIEL', 'A_CONFIRMER']),
  ] },
  bool('generator'), bool('ups'), bool('insuranceBI'), bool('insuranceProperty'), bool('insuranceCyber'),
  { key: 'insuranceLastReview', kind: 'date' },
  // Section 6
  sel('internalChannel', ['courriel', 'sms', 'telephone', 'teams', 'slack', 'application', 'autre']),
  bool('massAlertSystem'),
  sel('externalChannel', ['site_web', 'medias_sociaux', 'communique', 'courriel_clients', 'multiple']),
  t('priorityClients'),
  { key: 'authoritiesToNotify', kind: 'multi', options: ['CNESST', 'Environnement Canada', 'Autorité des marchés financiers (AMF)', 'OCRCVM', 'Santé Canada', 'Sécurité publique Québec', 'Autres régulateurs sectoriels'] },
  t('mediaContact'),
  // Section 7
  t('activationCriteria'), t('coordinationLocation'), t('emergencyBridge'), sel('linkedPmuId', ['pmu-lie']),
  // Section 8
  ...['exerciseFormative', 'exerciseTable', 'exerciseSimulation', 'exerciseIT'].map((k) => sel(k, EXERCISE)),
  t('planOwner'), sel('reviewFrequency', ['Annuel', 'Semestriel', 'Lors de changements significatifs']),
  { key: 'nextReviewDate', kind: 'date' },
];

/** Code interne (ex. « heures_bureau », « 1sem », « A_CONFIRMER ») apparu dans le texte. */
function leaksCode(opt: string, out: string, none: string): boolean {
  if (!/_|^[A-Z]{4,}$|^\d+(sem|mois)$|^[a-z]+$/.test(opt)) return false;
  // Libellé qui contient le mot lui-même (ex. « Dedicated application »).
  if ([pcaOption(opt, 'fr'), pcaOption(opt, 'en')].some((l) => l !== opt && l.includes(opt))) return false;
  const re = new RegExp(`(^|[^\\wÀ-ÿ])${opt.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(?![\\wÀ-ÿ])`, 'g');
  return (out.match(re) || []).length > (none.match(re) || []).length;
}

const marker = (path: string) => `ZQ${path.replace(/\W/g, '')}X`;

function sample(f: Field, path: string, alt = false): any {
  switch (f.kind) {
    case 'text': return marker(path);
    case 'number': return 7123;
    case 'date': return alt ? '2032-08-19' : '2031-03-17';
    case 'bool': return !alt;
    case 'select': return f.options![alt ? 0 : Math.min(1, f.options!.length - 1)];
    case 'multi': return [...f.options!];
    case 'list': {
      // « Autre » : seul scénario où la description libre est demandée.
      const item: Record<string, any> = { id: path === 'riskScenarios' ? 'autre' : 'x1' };
      for (const sub of f.items!) item[sub.key] = sample(sub, `${path}.${sub.key}`, alt);
      return [item];
    }
  }
}

function empty(f: Field): any {
  return f.kind === 'list' || f.kind === 'multi' ? [] : f.kind === 'bool' ? null : '';
}

async function render(config: Record<string, any>): Promise<string> {
  const project = {
    documentType: 'PCA', name: 'PCA', year: 2027,
    client: { name: 'Client', phone: '' },
    building: { name: 'Bâtiment', address: '1 rue A', city: 'Laval', province: 'QC' },
    user: { firstName: 'A', lastName: 'B' }, organization: { companyName: 'Firme' },
  };
  const svc: any = new GeneratorService({ project: { findUnique: async () => project } } as any, null as any, null as any);
  const ctx = await svc.buildContext('p', config);
  const { fr, en } = generatePcaModules(ctx, config);
  return JSON.stringify([fr, en]);
}

describe('Couverture configurateur PCA → PDF', () => {
  jest.setTimeout(120000);

  it('chaque champ, sous-champ et option du configurateur PCA a un effet sur le document', async () => {
    const full: Record<string, any> = {};
    for (const f of FIELDS) full[f.key] = sample(f, f.key);
    const base = await render(full);
    const problems: string[] = [];

    for (const f of FIELDS) {
      if ((await render({ ...full, [f.key]: empty(f) })) === base) problems.push(`${f.key} : aucun effet`);
      if (f.kind === 'text' && !base.includes(marker(f.key))) problems.push(`${f.key} : valeur non affichée`);

      // linkedPmuId : identifiant du PMU lié ; le document indique seulement que le lien existe.
      if ((f.kind === 'select' || f.kind === 'date' || f.kind === 'bool') && f.key !== 'linkedPmuId') {
        if ((await render({ ...full, [f.key]: sample(f, f.key, true) })) === base) problems.push(`${f.key} : changer la valeur ne change rien`);
      }
      if (f.kind === 'select') {
        const none = await render({ ...full, [f.key]: '' });
        for (const opt of f.options!) {
          const out = await render({ ...full, [f.key]: opt });
          if (out === none) problems.push(`${f.key} : option « ${opt} » sans effet`);
          if (leaksCode(opt, out, none)) problems.push(`${f.key} : code « ${opt} » affiché tel quel`);
        }
      }
      if (f.kind === 'multi') {
        for (const opt of f.options!) {
          if ((await render({ ...full, [f.key]: f.options!.filter((o) => o !== opt) })) === base) problems.push(`${f.key} : option « ${opt} » sans effet`);
        }
      }
      if (f.kind === 'list') {
        const item = full[f.key][0];
        for (const sub of f.items!) {
          const path = `${f.key}.${sub.key}`;
          if (sub.kind === 'text' && !base.includes(marker(path))) problems.push(`${path} : valeur non affichée`);
          if (sub.kind === 'select' || sub.kind === 'bool') {
            const changed = await render({ ...full, [f.key]: [{ ...item, [sub.key]: sample(sub, path, true) }] });
            if (changed === base) problems.push(`${path} : changer la valeur ne change rien`);
          }
          if (sub.kind === 'select') {
            const none = await render({ ...full, [f.key]: [{ ...item, [sub.key]: '' }] });
            for (const opt of sub.options!) {
              const out = await render({ ...full, [f.key]: [{ ...item, [sub.key]: opt }] });
              // A_CONFIRMER est la valeur par défaut d'un fournisseur sans statut.
              if (out === none && opt !== 'A_CONFIRMER') problems.push(`${path} : option « ${opt} » sans effet`);
              // Probabilité/impact : le niveau de risque s'écrit volontairement en majuscules (« 2 - FAIBLE »).
              if (!['probability', 'impact'].includes(sub.key) && leaksCode(opt, out, none)) problems.push(`${path} : code « ${opt} » affiché tel quel`);
            }
          }
        }
      }
    }
    if (process.env.COVERAGE_REPORT) require('fs').writeFileSync(process.env.COVERAGE_REPORT, problems.join('\n'));
    expect(problems).toEqual([]);
  });
});
