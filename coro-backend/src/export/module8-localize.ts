// ============================================================
// Module 8 — version anglaise des données enregistrées
// L'éditeur du module 8 enregistre une seule copie, rédigée à partir du
// modèle français. À l'export anglais, tout texte resté identique au modèle
// français est remplacé par le texte anglais au même endroit du modèle.
// Ce que le conseiller a réellement modifié reste tel quel.
// ============================================================

/** Corrige les « \n » enregistrés en toutes lettres par d'anciennes versions. */
export function unescapeNewlines(text: string): string {
  return typeof text === 'string' ? text.replace(/\\n/g, '\n') : text;
}

function sameText(a: string, b: string): boolean {
  const norm = (value: string) => unescapeNewlines(value).replace(/\s+/g, ' ').trim();
  return norm(a) === norm(b);
}

function findCounterpart(list: any[] | undefined, item: any, index: number): number {
  if (!Array.isArray(list)) return -1;
  if (item && typeof item === 'object' && typeof item.id === 'string') {
    const byId = list.findIndex((candidate) => candidate && candidate.id === item.id);
    if (byId >= 0) return byId;
  }
  return index < list.length ? index : -1;
}

/** Remplace, feuille par feuille, le texte resté identique au modèle FR par le modèle EN. */
export function localizeLikeTemplate(saved: any, fr: any, en: any): any {
  if (typeof saved === 'string') {
    return typeof fr === 'string' && typeof en === 'string' && sameText(saved, fr) ? en : saved;
  }
  if (Array.isArray(saved)) {
    return saved.map((item, index) => {
      const j = findCounterpart(fr, item, index);
      if (j < 0) return item;
      const k = findCounterpart(en, fr[j], j);
      return k < 0 ? item : localizeLikeTemplate(item, fr[j], en[k]);
    });
  }
  if (saved && typeof saved === 'object') {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(saved)) {
      out[key] = localizeLikeTemplate(value, fr?.[key], en?.[key]);
    }
    return out;
  }
  return saved;
}

function sectionPayload(section: any): any {
  if (!section) return undefined;
  if (Array.isArray(section.entries)) return section.entries;
  if (Array.isArray(section.tables)) return section;
  return section.content;
}

export function localizeModule8ForEnglish(saved: any, modulesFr: any[], modulesEn: any[]): any {
  if (!saved || typeof saved !== 'object') return saved;
  const fr = (modulesFr || []).find((m: any) => m?.moduleNumber === 8);
  const en = (modulesEn || []).find((m: any) => m?.moduleNumber === 8);
  if (!fr || !en) return saved;
  const out: Record<string, any> = { ...saved };
  for (const key of Object.keys(saved)) {
    const match = /^section(\d+)_(\d+)$/.exec(key);
    if (!match) continue;
    const id = `${match[1]}.${match[2]}`;
    const frSection = fr.sections?.find((s: any) => s.id === id);
    const enSection = en.sections?.find((s: any) => s.id === id);
    if (!frSection || !enSection) continue;
    out[key] = localizeLikeTemplate(saved[key], sectionPayload(frSection), sectionPayload(enSection));
  }
  return out;
}
