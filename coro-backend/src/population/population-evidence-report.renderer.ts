import { readFile } from 'fs/promises';
import { join } from 'path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFPage, rgb } from 'pdf-lib';

export const POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION = 'coro-evidence-pdf/1.1.0';

type RenderInput = {
  evidence: any;
  manifestRecord: any;
  verification: { status: 'VERIFIED' | 'MISMATCH' | 'UNAVAILABLE'; verifiedAt: string };
  reportGeneratedAt: Date;
};

const labels: Record<string, string> = {
  COMPLETE: 'Complet', COMPLETE_WITH_EXCEPTIONS: 'Complet avec exceptions', INCOMPLETE: 'Incomplet',
  LIVE: 'Diffusion réelle', SANDBOX: 'Simulation', DELIVERED: 'Livraison confirmée',
  SENT: 'Acceptée par le fournisseur', ACCEPTED: 'Acceptée par le fournisseur', FAILED: 'Échec confirmé', SUPPRESSED: 'Supprimée avant diffusion',
  ACTIVE: 'Active', READY: 'Prête pour validation', CLIENT_MANAGER: 'Gestionnaire client', CLIENT_USER: 'Utilisateur client',
  VERIFIED: 'Vérifiée', MISMATCH: "Divergence d'intégrité", UNAVAILABLE: 'Non disponible',
  SHELTER_IN_PLACE: "Mise à l'abri",
  TEST: 'Communication initiale de test', EMERGENCY: "Communication initiale d'urgence",
  UPDATE: 'Mise à jour', ALL_CLEAR: "Fin d'alerte",
};
const human = (value: unknown) => labels[String(value)] ?? String(value ?? '-');
const utc = (value: unknown) => value ? new Intl.DateTimeFormat('fr-CA', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date(String(value))).replace(' h ', ' h ') + ' UTC' : 'Non enregistré';
const actor = (value: any) => value?.displayName ? `${value.displayName}${value.role ? ` — ${human(value.role)}` : ''}` : 'Non enregistré';
const displayNumber = (value: unknown) => typeof value === 'number' ? String(value) : 'Non disponible';
const n = (value: unknown) => typeof value === 'number' ? value : 0;
export const cleanEvidenceText = (value: unknown) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

export function buildPopulationEvidenceReportText(input: RenderInput): string[] {
  const s = input.evidence.snapshot;
  const m = input.manifestRecord.manifest;
  const out: string[] = [
    'CORO', 'SENTINELLE POPULATION', "DOSSIER DE PREUVE D'ÉVÉNEMENT", "Rapport de communication d'urgence",
    `Référence : ${input.evidence.reference}`, `Version : ${input.evidence.version}`,
    `Organisation : ${s.organization.name}`, `Bâtiment : ${s.building.name}`, `Scénario : ${s.scenario.nameFR}`,
    `Début : ${utc(s.event.startedAt)}`, `Fin : ${utc(s.event.endedAt)}`,
    `Période de l'événement : ${utc(s.event.startedAt)} — ${utc(s.event.endedAt)}`,
    'COMPLÉTUDE', human(s.summary.completionStatus), 'INTÉGRITÉ', input.verification.status === 'VERIFIED' ? 'Vérifiée' : human(input.verification.status),
    '', "La vérification CORO confirme la cohérence des empreintes enregistrées; elle ne constitue pas une signature numérique indépendante.",
    '[[PAGE_BREAK]]', 'IDENTIFICATION DOCUMENTAIRE', `Schéma Evidence : ${input.evidence.schemaVersion}`,
    `Evidence version : ${input.evidence.version}`, `Manifest schema : ${input.manifestRecord.schemaVersion}`,
    `Manifest version : ${input.manifestRecord.version}`, `Dossier figé le : ${utc(input.evidence.generatedAt)}`,
    `Dossier généré par : ${human(input.evidence.generatedByType)}, enregistré dans la piste d'audit`,
    `Rapport généré le : ${utc(input.reportGeneratedAt)}`, `Générateur : ${POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION}`,
    '', "Ce rapport est une représentation du dossier de preuve figé dans CORO.",
    "La vérification d'intégrité confirme que les données utilisées correspondent aux empreintes enregistrées par CORO.",
    "Le dossier et ses empreintes sont conservés dans la même infrastructure CORO. Cette vérification ne constitue pas une signature numérique indépendante ni une certification juridique.",
    '', 'SYNTHÈSE EXÉCUTIVE',
    `${s.summary.communicationCount} communications publiques ont été enregistrées; ${n(s.summary.deliveryCount)} ont été matérialisées et ${n(s.summary.delivered)} ont une livraison confirmée.`,
    `${n(s.summary.failed)} échec; ${n(s.summary.outcomeUnknown)} résultat à confirmer; ${n(s.summary.retryPending)} nouvelle tentative en attente.`,
    `Site : ${s.building.name}. Scénario : ${s.scenario.nameFR}. Mode : ${human(s.program.deliveryMode)}. Clôture : ${utc(s.closure.endedAt)}.`,
    '', '1. IDENTIFICATION', `Adresse : ${[s.building.address, s.building.city, s.building.province, s.building.postalCode].filter(Boolean).join(', ')}`,
    `Programme : ${s.program.publicSlug}`, `Statut : Finalisé`, `Fuseau horaire : UTC`,
    '', '2. CHRONOLOGIE', `Ouverture de l'événement — ${utc(s.event.startedAt)} — ${actor(s.event.startedBy)}`,
  ];
  for (const c of s.communications) {
    out.push(`Communication #${c.cycleSequence} - ${human(c.type)}`);
    for (const [label, key] of [['Créée', 'createdAt'], ['Prête pour validation', 'readyAt'], ['Approuvée', 'approvedAt'], ['Destinataires figés', 'recipientsFrozenAt'], ['Diffusion déclenchée', 'activatedAt']] as const) {
      if (c.timestamps[key]) out.push(`  ${label} - ${utc(c.timestamps[key])}`);
    }
  }
  out.push(`Clôture de l'événement — ${utc(s.closure.endedAt)} — ${actor(s.closure.endedBy)}`, '', '3. COMMUNICATIONS');
  for (const c of s.communications) {
    out.push(`3.${c.cycleSequence} - ${human(c.type)}`, `Mode : ${human(c.deliveryMode)} | Statut final : ${human(c.status)}`,
      `Créée par : ${actor(c.actors.createdBy)} | Approuvée par : ${actor(c.actors.approvedBy)} | Diffusée par : ${actor(c.actors.sentBy)}`,
      'CONTENU APPROUVÉ', `Titre FR : ${c.content.titleFR}`, `Message FR : ${c.content.messageFR}`, `Consigne FR : ${c.content.instructionFR ?? '-'}`);
    if (c.content.titleEN || c.content.messageEN) out.push('VERSION ANGLAISE', `Title: ${c.content.titleEN ?? '-'}`, `Message: ${c.content.messageEN ?? '-'}`, `Instruction: ${c.content.instructionEN ?? '-'}`);
    out.push('CONTENU MATÉRIALISÉ', c.content.materializedVariants.length === 1 ? 'Une seule variante matérialisée a été observée.' : `${c.content.materializedVariants.length} variantes matérialisées ont été observées.`);
    for (const variant of c.content.materializedVariants) out.push(`${variant.channel} ${variant.language} : ${variant.message}`);
  }
  out.push('', '4. CIBLAGE');
  for (const c of s.communications) {
    const t = c.targeting ?? {};
    out.push(`Communication #${c.cycleSequence} - ${human(c.type)}`,
      `Personnes uniques ciblées : ${displayNumber(t.uniqueTargetCount)}`, `Population actuelle : ${displayNumber(t.currentZoneSubscriberCount)}`,
      `Personnes historiquement concernées : ${displayNumber(t.historicalSubscriberCount)}`, `Chevauchement : ${displayNumber(t.overlapSubscriberCount)}`,
      `Personnes exclues après revalidation : ${displayNumber(t.revalidationSuppressedSubscriberCount)}`,
      `Personnes admissibles après revalidation : ${displayNumber(t.deliverableSubscriberCount)}`);
    if (c.type === 'ALL_CLEAR') out.push(`Formule de fin d'alerte : ${displayNumber(t.currentZoneSubscriberCount)} + ${displayNumber(t.historicalSubscriberCount)} - ${displayNumber(t.overlapSubscriberCount)} = ${displayNumber(t.uniqueTargetCount)}`);
  }
  out.push('', '5. ZONES');
  for (const c of s.communications) for (const z of c.zones) out.push(`#${c.cycleSequence} ${z.code} — ${z.nameFR}; rayon ${z.maxDistanceKm ?? '-'} km; action ${human(z.protectiveAction)}; ${z.targetedSubscriberCount} cible(s); géométrie associée : ${z.geometry.present ? 'oui' : 'non'}.`);
  out.push('', '6. PREUVE DE DIFFUSION');
  for (const c of s.communications) {
    const d = c.deliverySummary; const p = c.providerSummary;
    out.push(`Communication #${c.cycleSequence} — ${human(c.type)}`, 'GRILLE DE DIFFUSION',
      `Canal — Courriel : ${displayNumber(d.emailCount)}`, `Canal — SMS : ${displayNumber(d.smsCount)}`,
      `Matérialisées : ${displayNumber(d.materialized)}`, `Communications admissibles matérialisées : ${displayNumber(d.deliverable)}`,
      `Acceptées fournisseur : ${displayNumber(d.sent)}`, `Livraisons confirmées : ${displayNumber(d.delivered)}`,
      `Échecs : ${displayNumber(d.failed)}`, `Supprimées : ${displayNumber(d.suppressed)}`,
      `Résultats à confirmer : ${displayNumber(d.outcomeUnknown)}`, `Nouvelles tentatives : ${displayNumber(d.retryPending)}`,
      'PREUVE FOURNISSEUR', `Acceptées : ${displayNumber(p.counts.ACCEPTED)}`, `Livrées : ${displayNumber(p.counts.DELIVERED)}`,
      `Échecs / rebonds : ${typeof p.counts.FAILED === 'number' && typeof p.counts.BOUNCE === 'number' ? p.counts.FAILED + p.counts.BOUNCE : 'Non disponible'}`,
      `Premier événement : ${utc(p.firstProviderOccurredAt)}`, `Dernier événement : ${utc(p.lastProviderOccurredAt)}`);
  }
  out.push("Une communication acceptée par le fournisseur n'est pas nécessairement une livraison confirmée.", '', '7. ACTEURS ET VALIDATIONS');
  for (const c of s.communications) for (const [label, key, time] of [['Création', 'createdBy', 'createdAt'], ['Prête pour validation', 'readyBy', 'readyAt'], ['Approbation', 'approvedBy', 'approvedAt'], ['Gel des destinataires', 'frozenBy', 'recipientsFrozenAt'], ['Diffusion', 'sentBy', 'activatedAt']] as const) if (c.timestamps[time]) out.push(`#${c.cycleSequence} ${label} — ${actor(c.actors[key])} — ${utc(c.timestamps[time])}`);
  out.push('', '8. CLÔTURE', `Début : ${utc(s.event.startedAt)}`, `Fin : ${utc(s.closure.endedAt)}`, `Clôture par : ${actor(s.closure.endedBy)}`, `Motif : ${s.closure.closeReason ?? 'Aucun motif exceptionnel enregistré.'}`, `Complétude : ${human(s.summary.completionStatus)}`, '', '9. EXCEPTIONS');
  const exceptions = n(s.summary.failed) + n(s.summary.suppressed) + n(s.summary.outcomeUnknown) + n(s.summary.retryPending);
  out.push(exceptions === 0 && !s.closure.closeReason ? "Aucune exception de diffusion non résolue n'est enregistrée dans le snapshot de preuve." : `Échecs ${n(s.summary.failed)}; suppressions ${n(s.summary.suppressed)}; résultats à confirmer ${n(s.summary.outcomeUnknown)}; reprises en attente ${n(s.summary.retryPending)}; motif ${s.closure.closeReason ?? '-'}.`);
  out.push('', '10. INTÉGRITÉ', `Résultat au moment de la génération : ${human(input.verification.status)}`, `Empreinte du snapshot : ${input.evidence.snapshotSha256}`, `Empreinte du manifest : ${input.manifestRecord.manifestSha256}`, `Canonicalisation : ${m.canonicalization}`, `Algorithme : ${m.integrity.algorithm}`, '', 'ANNEXE A — EMPREINTES', `Empreinte du snapshot : ${input.evidence.snapshotSha256}`, `Empreinte du manifest : ${input.manifestRecord.manifestSha256}`);
  const componentLabels: Record<string, string> = { eventSha256: "Empreinte de l'événement", communicationsSha256: 'Empreinte des communications', deliverySummarySha256: 'Empreinte de la synthèse de diffusion', providerEvidenceSha256: 'Empreinte de la preuve fournisseur' };
  for (const [key, value] of Object.entries(m.components)) out.push(`${componentLabels[key] ?? human(key)} (${key}) : ${value}`);
  out.push('', 'ANNEXE B — DONNÉES TECHNIQUES SÛRES', `Référence de l'événement : ${s.event.id}`, `Identifiant Evidence : ${input.evidence.id}`, `Identifiant Manifest : ${input.manifestRecord.id}`, `Résultat de vérification : ${input.verification.status}`, `Vérification ISO UTC : ${new Date(input.verification.verifiedAt).toISOString()}`, `Générateur : ${POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION}`);
  return out.map(cleanEvidenceText);
}

export class PopulationEvidenceReportRenderer {
  async render(input: RenderInput): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit);
    pdf.setTitle(`${input.evidence.reference} — Dossier de preuve d'événement`);
    pdf.setAuthor('CORO'); pdf.setSubject("Rapport de communication d'urgence");
    pdf.setCreator(POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION); pdf.setProducer('CORO / pdf-lib');
    pdf.setCreationDate(input.reportGeneratedAt); pdf.setModificationDate(input.reportGeneratedAt);
    const fontBytes = await readFile(join(process.cwd(), 'assets', 'fonts', 'NotoSans-Variable.ttf'));
    const regular = await pdf.embedFont(fontBytes, { subset: true });
    const bold = await pdf.embedFont(fontBytes, { subset: true, customName: 'NotoSans-Bold' });
    const lines = buildPopulationEvidenceReportText(input);
    let page: PDFPage; let y = 0; let pageNo = 0;
    const pages: PDFPage[] = [];
    const addPage = () => { page = pdf.addPage([595.28, 841.89]); pages.push(page); pageNo += 1; y = 790; if (pageNo > 1) page.drawText('CORO - SENTINELLE POPULATION', { x: 48, y: 812, size: 8, font: bold, color: rgb(.09, .42, .35) }); };
    addPage();
    for (const raw of lines) {
      if (raw === '[[PAGE_BREAK]]') { addPage(); continue; }
      const heading = /^[0-9]+\.|^ANNEXE|^SYNTHESE|^IDENTIFICATION DOCUMENTAIRE|^CONTENU/.test(raw);
      const size = heading ? 13 : 9.5; const font = heading ? bold : regular; const maxWidth = 499;
      const words = (raw || ' ').split(/\s+/); let line = '';
      const wrapped: string[] = [];
      for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate; else { if (line) wrapped.push(line); line = word; } } wrapped.push(line || ' ');
      for (const text of wrapped) { if (y < 58) addPage(); page!.drawText(text, { x: 48, y, size, font, color: heading ? rgb(.08, .32, .29) : rgb(.13, .18, .19) }); y -= heading ? 19 : 13; }
      if (heading || raw === '') y -= 5;
    }
    pages.forEach((item, index) => { item.drawLine({ start: { x: 48, y: 40 }, end: { x: 547, y: 40 }, thickness: .5, color: rgb(.72, .77, .77) }); item.drawText(`CORO — Sentinelle Population | ${input.evidence.reference} | Version ${input.evidence.version} | Dossier opérationnel — diffusion contrôlée`, { x: 48, y: 24, size: 7, font: regular }); item.drawText(`Page ${index + 1} / ${pages.length}`, { x: 500, y: 24, size: 7, font: regular }); });
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }
}
