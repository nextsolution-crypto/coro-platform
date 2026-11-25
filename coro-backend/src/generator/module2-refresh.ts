// ============================================================
// CORO — Liste téléphonique enregistrée vs modèle à jour
// À la régénération, la liste enregistrée par l'éditeur est conservée,
// mais :
//  - une ligne jamais remplie (rôle sans nom ni téléphone) suit le modèle
//    à jour du bâtiment (ex. une tour à bureaux ne garde pas « Directeur
//    de l'usine » hérité d'une ancienne génération);
//  - les anciennes lignes GardaWorld codées en dur sont retirées;
//  - le siège social de la firme du modèle est ajouté s'il manque.
// Une ligne remplie par le conseiller n'est jamais retirée.
// ============================================================

type Row = { id?: string; role?: string; name?: string; phone?: string; [key: string]: unknown };

const norm = (value: unknown) =>
  String(value ?? '')
    .toLocaleLowerCase('fr-CA')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Lignes que CORO ajoutait d'office avant le 24 nov. 2026 (retirées du modèle). */
function isLegacyFirmRow(row: Row): boolean {
  const role = norm(row.role);
  const phone = String(row.phone ?? '').replace(/\D/g, '');
  if (norm(row.name) === 'gardaworld' && phone === '5141234567') return true;
  return /^(siege social de gardaworld|gardaworld head office)/.test(role) && phone === '5142812811';
}

const isFilled = (row: Row) => !!String(row.name ?? '').trim() || !!String(row.phone ?? '').trim();

/**
 * Lignes de saisie (2.2, 2.3) : les lignes du modèle à jour, complétées par
 * ce que le conseiller a rempli sous le même rôle, puis ses autres lignes remplies.
 */
export function refreshEditableRows(saved: Row[] | undefined, template: Row[]): Row[] {
  if (!Array.isArray(saved) || saved.length === 0) return template;
  const kept = saved.filter((row) => !isLegacyFirmRow(row) && isFilled(row));
  const used = new Set<Row>();
  const merged = template.map((row) => {
    const match = kept.find((candidate) => !used.has(candidate) && norm(candidate.role) === norm(row.role));
    if (!match) return row;
    used.add(match);
    return { ...row, ...match, role: match.role || row.role };
  });
  return [...merged, ...kept.filter((row) => !used.has(row))];
}

/** Ressources externes (2.4) : on retire les anciennes lignes de firme et on ajoute celles du modèle qui manquent. */
export function refreshExternalRows(saved: Row[] | undefined, template: Row[]): Row[] {
  if (!Array.isArray(saved) || saved.length === 0) return template;
  const kept = saved.filter((row) => !isLegacyFirmRow(row));
  const missing = template.filter(
    (row) => row.isBold && !kept.some((candidate) => norm(candidate.role) === norm(row.role)),
  );
  return [...kept, ...missing];
}

/** Liste téléphonique enregistrée, rafraîchie avec le modèle généré (sections FR). */
export function refreshSavedModule2(saved: any, generatedFr: any): any {
  if (!saved || typeof saved !== 'object') return saved;
  const entries = (id: string): Row[] =>
    generatedFr?.sections?.find((section: any) => section.id === id)?.entries || [];
  return {
    ...saved,
    section2_2: refreshEditableRows(saved.section2_2, entries('2.2')),
    section2_3: refreshEditableRows(saved.section2_3, entries('2.3')),
    section2_4: refreshExternalRows(saved.section2_4, entries('2.4')),
  };
}
