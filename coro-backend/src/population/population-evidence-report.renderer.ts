import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

export const POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION = 'coro-evidence-pdf/1.0.0';

type RenderInput = {
  evidence: any;
  manifestRecord: any;
  verification: { status: 'VERIFIED' | 'MISMATCH' | 'UNAVAILABLE'; verifiedAt: string };
  reportGeneratedAt: Date;
};

const labels: Record<string, string> = {
  COMPLETE: 'Complet', COMPLETE_WITH_EXCEPTIONS: 'Complet avec exceptions', INCOMPLETE: 'Incomplet',
  LIVE: 'Diffusion reelle', SANDBOX: 'Simulation', DELIVERED: 'Livraison confirmee',
  SENT: 'Acceptee par le fournisseur', SHELTER_IN_PLACE: "Mise a l'abri",
  TEST: 'Communication initiale de test', EMERGENCY: "Communication initiale d'urgence",
  UPDATE: 'Mise a jour', ALL_CLEAR: "Fin d'alerte",
};
const human = (value: unknown) => labels[String(value)] ?? String(value ?? '-');
const utc = (value: unknown) => value ? `${new Date(String(value)).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}` : 'Non enregistre';
const actor = (value: any) => value?.displayName ? `${value.displayName}${value.role ? ` (${value.role})` : ''}` : 'Non enregistre';
const n = (value: unknown) => typeof value === 'number' ? value : 0;
const clean = (value: unknown) => String(value ?? '').replace(/[\u2018\u2019]/g, "'").replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '');

export function buildPopulationEvidenceReportText(input: RenderInput): string[] {
  const s = input.evidence.snapshot;
  const m = input.manifestRecord.manifest;
  const out: string[] = [
    "CORO SENTINELLE POPULATION", "DOSSIER DE PREUVE D'EVENEMENT", "Rapport de communication d'urgence",
    `Reference : ${input.evidence.reference}`, `Version : ${input.evidence.version}`,
    `Organisation : ${s.organization.name}`, `Batiment : ${s.building.name}`, `Scenario : ${s.scenario.nameFR}`,
    `Debut : ${utc(s.event.startedAt)}`, `Fin : ${utc(s.event.endedAt)}`,
    `Completude : ${human(s.summary.completionStatus)}`, `Integrite : ${input.verification.status === 'VERIFIED' ? 'INTEGRITE VERIFIEE' : human(input.verification.status)}`,
    '', 'IDENTIFICATION DOCUMENTAIRE', `Evidence schema : ${input.evidence.schemaVersion}`,
    `Evidence version : ${input.evidence.version}`, `Manifest schema : ${input.manifestRecord.schemaVersion}`,
    `Manifest version : ${input.manifestRecord.version}`, `Dossier fige le : ${utc(input.evidence.generatedAt)}`,
    `Dossier genere par : acteur ${input.evidence.generatedByType} enregistre dans la piste d'audit`,
    `Rapport genere le : ${utc(input.reportGeneratedAt)}`, `Generateur : ${POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION}`,
    '', "Ce rapport est une representation du dossier de preuve fige dans CORO.",
    "La verification d'integrite confirme que les donnees utilisees correspondent aux empreintes enregistrees par CORO.",
    "Le dossier et ses empreintes sont conserves dans la meme infrastructure CORO. Cette verification ne constitue pas une signature numerique independante ni une certification juridique.",
    '', 'SYNTHESE EXECUTIVE',
    `${s.summary.communicationCount} communications publiques ont ete enregistrees; ${n(s.summary.deliveryCount)} ont ete materialisees et ${n(s.summary.delivered)} ont une livraison confirmee.`,
    `${n(s.summary.failed)} echec; ${n(s.summary.outcomeUnknown)} resultat a confirmer; ${n(s.summary.retryPending)} nouvelle tentative en attente.`,
    `Site : ${s.building.name}. Scenario : ${s.scenario.nameFR}. Mode : ${human(s.program.deliveryMode)}. Cloture : ${utc(s.closure.endedAt)}.`,
    '', '1. IDENTIFICATION', `Adresse : ${[s.building.address, s.building.city, s.building.province, s.building.postalCode].filter(Boolean).join(', ')}`,
    `Programme : ${s.program.publicSlug}`, `Statut : Finalise`, `Fuseau horaire : UTC`,
    '', '2. CHRONOLOGIE', `Ouverture de l'evenement - ${utc(s.event.startedAt)} - ${actor(s.event.startedBy)}`,
  ];
  for (const c of s.communications) {
    out.push(`Communication #${c.cycleSequence} - ${human(c.type)}`);
    for (const [label, key] of [['Creee', 'createdAt'], ['Prete', 'readyAt'], ['Approuvee', 'approvedAt'], ['Destinataires figes', 'recipientsFrozenAt'], ['Diffusion declenchee', 'activatedAt']] as const) {
      if (c.timestamps[key]) out.push(`  ${label} - ${utc(c.timestamps[key])}`);
    }
  }
  out.push(`Cloture de l'evenement - ${utc(s.closure.endedAt)} - ${actor(s.closure.endedBy)}`, '', '3. COMMUNICATIONS');
  for (const c of s.communications) {
    out.push(`3.${c.cycleSequence} - ${human(c.type)}`, `Mode : ${human(c.deliveryMode)} | Statut final : ${human(c.status)}`,
      `Creee par : ${actor(c.actors.createdBy)} | Approuvee par : ${actor(c.actors.approvedBy)} | Diffusee par : ${actor(c.actors.sentBy)}`,
      'CONTENU APPROUVE', `Titre FR : ${c.content.titleFR}`, `Message FR : ${c.content.messageFR}`, `Consigne FR : ${c.content.instructionFR ?? '-'}`);
    if (c.content.titleEN || c.content.messageEN) out.push('VERSION ANGLAISE', `Title: ${c.content.titleEN ?? '-'}`, `Message: ${c.content.messageEN ?? '-'}`, `Instruction: ${c.content.instructionEN ?? '-'}`);
    out.push('CONTENU MATERIALISE', c.content.materializedVariants.length === 1 ? 'Une seule variante materialisee a ete observee.' : `${c.content.materializedVariants.length} variantes materialisees ont ete observees.`);
    for (const variant of c.content.materializedVariants) out.push(`${variant.channel} ${variant.language} : ${variant.message}`);
  }
  out.push('', '4. CIBLAGE');
  for (const c of s.communications) {
    const t = c.targeting ?? {};
    out.push(`Communication #${c.cycleSequence} - ${human(c.type)}`,
      `Personnes uniques ciblees : ${n(t.uniqueTargetCount)}`, `Population actuelle : ${n(t.currentZoneSubscriberCount)}`,
      `Personnes historiquement concernees : ${n(t.historicalSubscriberCount)}`, `Chevauchement : ${n(t.overlapSubscriberCount)}`,
      `Personnes exclues apres revalidation : ${n(t.revalidationSuppressedSubscriberCount)}`,
      `Communications admissibles a la diffusion : ${n(t.deliverableSubscriberCount)}`);
    if (c.type === 'ALL_CLEAR') out.push(`Formule de fin d'alerte : ${n(t.currentZoneSubscriberCount)} + ${n(t.historicalSubscriberCount)} - ${n(t.overlapSubscriberCount)} = ${n(t.uniqueTargetCount)}`);
  }
  out.push('', '5. ZONES');
  for (const c of s.communications) for (const z of c.zones) out.push(`#${c.cycleSequence} ${z.code} - ${z.nameFR}; rayon ${z.maxDistanceKm ?? '-'} km; action ${human(z.protectiveAction)}; ${z.targetedSubscriberCount} cible(s); geometrie associee : ${z.geometry.present ? 'oui' : 'non'}.`);
  out.push('', '6. PREUVE DE DIFFUSION');
  for (const c of s.communications) {
    const d = c.deliverySummary; const p = c.providerSummary;
    out.push(`Communication #${c.cycleSequence} - ${human(c.type)}`, `Courriels : ${n(d.emailCount)} | SMS : ${n(d.smsCount)} | Materialisees : ${n(d.materialized)} | Admissibles : ${n(d.deliverable)}`,
      `Acceptees par le fournisseur : ${n(d.sent)} | Livraisons confirmees : ${n(d.delivered)} | Echecs : ${n(d.failed)} | Supprimees : ${n(d.suppressed)}`,
      `Resultats a confirmer : ${n(d.outcomeUnknown)} | Nouvelles tentatives en attente : ${n(d.retryPending)}`,
      `Fournisseur ACCEPTED : ${n(p.counts.ACCEPTED)} | DELIVERED : ${n(p.counts.DELIVERED)} | FAILED/BOUNCE : ${n(p.counts.FAILED) + n(p.counts.BOUNCE)}`,
      `Premier evenement fournisseur : ${utc(p.firstProviderOccurredAt)} | Dernier : ${utc(p.lastProviderOccurredAt)}`);
  }
  out.push("ACCEPTED signifie que le fournisseur a accepte la communication. DELIVERED signifie que le fournisseur a confirme la livraison.", '', '7. ACTEURS ET VALIDATIONS');
  for (const c of s.communications) for (const [label, key, time] of [['Creation', 'createdBy', 'createdAt'], ['Passage READY', 'readyBy', 'readyAt'], ['Approbation', 'approvedBy', 'approvedAt'], ['Gel des destinataires', 'frozenBy', 'recipientsFrozenAt'], ['Diffusion', 'sentBy', 'activatedAt']] as const) if (c.timestamps[time]) out.push(`#${c.cycleSequence} ${label} | ${actor(c.actors[key])} | ${utc(c.timestamps[time])}`);
  out.push('', '8. CLOTURE', `Debut : ${utc(s.event.startedAt)}`, `Fin : ${utc(s.closure.endedAt)}`, `Cloture par : ${actor(s.closure.endedBy)}`, `Motif : ${s.closure.closeReason ?? 'Aucun motif exceptionnel enregistre.'}`, `Completude : ${human(s.summary.completionStatus)}`, '', '9. EXCEPTIONS');
  const exceptions = n(s.summary.failed) + n(s.summary.suppressed) + n(s.summary.outcomeUnknown) + n(s.summary.retryPending);
  out.push(exceptions === 0 && !s.closure.closeReason ? "Aucune exception de diffusion non resolue n'est enregistree dans le snapshot de preuve." : `Echecs ${n(s.summary.failed)}; suppressions ${n(s.summary.suppressed)}; resultats a confirmer ${n(s.summary.outcomeUnknown)}; reprises en attente ${n(s.summary.retryPending)}; motif ${s.closure.closeReason ?? '-'}.`);
  out.push('', '10. INTEGRITE', `Resultat au moment de la generation : ${input.verification.status}`, `Snapshot SHA-256 : ${input.evidence.snapshotSha256}`, `Manifest SHA-256 : ${input.manifestRecord.manifestSha256}`, `Canonicalisation : ${m.canonicalization}`, `Algorithme : ${m.integrity.algorithm}`, '', 'ANNEXE A - EMPREINTES', `Snapshot : ${input.evidence.snapshotSha256}`, `Manifest : ${input.manifestRecord.manifestSha256}`);
  for (const [key, value] of Object.entries(m.components)) out.push(`${human(key)} : ${value}`);
  out.push('', 'ANNEXE B - DONNEES TECHNIQUES SURES', `Reference evenement : ${s.event.id}`, `Evidence : ${input.evidence.id}`, `Manifest : ${input.manifestRecord.id}`, `Verification : ${input.verification.status} le ${utc(input.verification.verifiedAt)}`);
  return out.map(clean);
}

export class PopulationEvidenceReportRenderer {
  async render(input: RenderInput): Promise<Buffer> {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`${input.evidence.reference} - Dossier de preuve d'evenement`);
    pdf.setAuthor('CORO'); pdf.setSubject("Rapport de communication d'urgence");
    pdf.setCreator(POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION); pdf.setProducer('CORO / pdf-lib');
    pdf.setCreationDate(input.reportGeneratedAt); pdf.setModificationDate(input.reportGeneratedAt);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const lines = buildPopulationEvidenceReportText(input);
    let page: PDFPage; let y = 0; let pageNo = 0;
    const pages: PDFPage[] = [];
    const addPage = () => { page = pdf.addPage([595.28, 841.89]); pages.push(page); pageNo += 1; y = 790; if (pageNo > 1) page.drawText('CORO - SENTINELLE POPULATION', { x: 48, y: 812, size: 8, font: bold, color: rgb(.09, .42, .35) }); };
    addPage();
    for (const raw of lines) {
      const heading = /^[0-9]+\.|^ANNEXE|^SYNTHESE|^IDENTIFICATION DOCUMENTAIRE|^CONTENU/.test(raw);
      const size = heading ? 13 : 9.5; const font = heading ? bold : regular; const maxWidth = 499;
      const words = (raw || ' ').split(/\s+/); let line = '';
      const wrapped: string[] = [];
      for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate; else { if (line) wrapped.push(line); line = word; } } wrapped.push(line || ' ');
      for (const text of wrapped) { if (y < 58) addPage(); page!.drawText(text, { x: 48, y, size, font, color: heading ? rgb(.08, .32, .29) : rgb(.13, .18, .19) }); y -= heading ? 19 : 13; }
      if (heading || raw === '') y -= 5;
    }
    pages.forEach((item, index) => { item.drawLine({ start: { x: 48, y: 40 }, end: { x: 547, y: 40 }, thickness: .5, color: rgb(.72, .77, .77) }); item.drawText(`CORO - Sentinelle Population | ${input.evidence.reference} | Version ${input.evidence.version} | Dossier operationnel - diffusion controlee`, { x: 48, y: 24, size: 7, font: regular }); item.drawText(`Page ${index + 1} / ${pages.length}`, { x: 500, y: 24, size: 7, font: regular }); });
    return Buffer.from(await pdf.save({ useObjectStreams: false }));
  }
}
