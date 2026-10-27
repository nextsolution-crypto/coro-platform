import type { DiagnosticModule, DiagnosticModuleId } from './types';

const status = {
  available: { fr: 'Disponible', en: 'Available' },
  conditional: { fr: 'Disponible sous conditions', en: 'Available under conditions' },
  development: { fr: 'En développement', en: 'In development' },
  planned: { fr: 'Prévu', en: 'Planned' },
} as const;

export const diagnosticModules: Readonly<Record<DiagnosticModuleId, DiagnosticModule>> = {
  buildings: { id: 'buildings', name: { fr: 'Bâtiments et portail Client', en: 'Buildings and Client Portal' }, availability: 'available', availabilityLabel: status.available, publicPath: '/portail-client', qualification: { fr: 'Gouvernance des bâtiments selon les droits accordés.', en: 'Building governance according to granted access.' } },
  documents: { id: 'documents', name: { fr: 'CORO Documents — PMU, PSI et PCA', en: 'CORO Documents — ERP, fire safety and continuity plans' }, availability: 'available', availabilityLabel: status.available, publicPath: '/gestion-documentaire', qualification: { fr: 'Gestion documentaire, versions et approbations.', en: 'Document management, versions and approvals.' } },
  knowledge: { id: 'knowledge', name: { fr: 'CORO Knowledge', en: 'CORO Knowledge' }, availability: 'conditional', availabilityLabel: status.conditional, publicPath: '/coro-knowledge', qualification: { fr: 'Selon l’admissibilité, le format, l’indexation et les droits de la source.', en: 'Subject to source eligibility, format, indexing and access rights.' } },
  ai: { id: 'ai', name: { fr: 'CORO AI', en: 'CORO AI' }, availability: 'conditional', availabilityLabel: status.conditional, publicPath: '/coro-ai', qualification: { fr: 'Assistance sourcée sans autorité opérationnelle autonome.', en: 'Source-grounded assistance without autonomous operational authority.' } },
  sentinelle: { id: 'sentinelle', name: { fr: 'CORO Sentinelle', en: 'CORO Sentinelle' }, availability: 'available', availabilityLabel: status.available, publicPath: '/sentinelle', qualification: { fr: 'Suivi des présences déclarées; ne garantit pas une présence exhaustive.', en: 'Tracks declared presence; does not guarantee an exhaustive occupancy record.' } },
  incident: { id: 'incident', name: { fr: 'CORO Incident', en: 'CORO Incident' }, availability: 'available', availabilityLabel: status.available, publicPath: '/coro-incident', qualification: { fr: 'Coordination, journal d’incident et traçabilité.', en: 'Coordination, incident log and traceability.' } },
  'exercises-rex-actions': { id: 'exercises-rex-actions', name: { fr: 'Exercices, REX et actions correctives', en: 'Exercises, lessons learned and corrective actions' }, availability: 'available', availabilityLabel: status.available, publicPath: '/resilience-operationnelle', qualification: { fr: 'Capacité disponible dans le parcours Résilience; aucune page Exercices dédiée n’est publiée.', en: 'Capability available through Resilience; no dedicated Exercises page is published.' } },
  ops: { id: 'ops', name: { fr: 'CORO Ops', en: 'CORO Ops' }, availability: 'planned', availabilityLabel: status.planned, qualification: { fr: 'Positionnement et page publics futurs; aucune capacité actuelle n’est promise.', en: 'Future public positioning and page; no current capability is promised.' } },
  network: { id: 'network', name: { fr: 'CORO Network', en: 'CORO Network' }, availability: 'planned', availabilityLabel: status.planned, qualification: { fr: 'Page publique future; ne pas présenter comme module public disponible.', en: 'Future public page; not presented as a currently available public module.' } },
  audit: { id: 'audit', name: { fr: 'Audits et constats', en: 'Audits and findings' }, availability: 'planned', availabilityLabel: status.planned, qualification: { fr: 'Bonne pratique suivie dans CORO; CORO Audit n’est pas présenté comme un module vendu.', en: 'A practice tracked in CORO; CORO Audit is not presented as a product module.' } },
  'coro-index': { id: 'coro-index', name: { fr: 'Indice CORO', en: 'CORO Index' }, availability: 'conditional', availabilityLabel: status.conditional, publicPath: '/resilience-operationnelle', qualification: { fr: 'Référentiel distinct : le score du Diagnostic Express n’est pas l’Indice CORO officiel.', en: 'A separate framework: the Express Diagnostic score is not the official CORO Index.' } },
};

export function resolveDiagnosticModules(ids: readonly DiagnosticModuleId[]): readonly DiagnosticModule[] {
  return ids.map((id) => diagnosticModules[id]);
}
