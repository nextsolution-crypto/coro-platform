export interface DocumentContext {
  clientName: string;
  buildingName: string;
  buildingAddress: string;
  city: string;
  province: string;
  year: number;
  documentType: string;
  responsableNom: string;
  responsableTitre: string;
  dateReleve: string;
  versionDocument: string;
  historiqueList: { date: string; type: string; responsable: string }[];
  floors: number;
  hauteurBatiment: boolean;
  multiLocataires: boolean;
  companyName: string;
  /** Téléphone de la firme-conseil (paramètres de l'organisation). */
  companyPhone?: string;
  /** Responsable du bâtiment réellement saisi (configurateur ou fiche bâtiment). */
  buildingManagerName?: string;
  /** Téléphone du responsable du bâtiment (fiche bâtiment). */
  responsablePhone?: string;
  /** Centrale de surveillance incendie déclarée au configurateur. */
  centraleSurveillance?: string;
  centraleTelephone?: string;
  buildingType: string;
  has_sprinklers?: boolean;
  has_generator?: boolean;
  has_elevators?: boolean;
  has_hazardous_materials?: boolean;
}

export interface ReglementRef {
  code: string;
  article: string;
  description: string;
  articleFormation: string;
  articleExercice: string;
  articleRevision: string;
  exerciceStandard: string;
  exerciceBGH: string;
  code_en: string;
  article_en: string;
  description_en: string;
  articleFormation_en: string;
  articleExercice_en: string;
  articleRevision_en: string;
  exerciceStandard_en: string;
  exerciceBGH_en: string;
}

export const REFERENCES: Record<string, ReglementRef> = {
  Quebec: {
    code: 'Code national de prévention des incendies – Canada 2020, incorporé au Chapitre VIII du Code de sécurité du Québec (RLRQ, c. B-1.1, r. 3)',
    article: 'article 2.8',
    description: 'Code de sécurité du Québec (RLRQ, c. B-1.1, r. 3)',
    articleFormation: 'article 2.8.2.1, paragraphe 3) c), du CNPI 2020 modifié Québec',
    articleExercice: 'article 2.8.3.2 du Code national de prévention des incendies – Canada 2020, incorporé au Chapitre VIII du Code de sécurité du Québec',
    articleRevision: 'article 2.8.2.1, paragraphe 2), du Code national de prévention des incendies – Canada 2020 (modifié Québec)',
    exerciceStandard: 'au moins une fois par année',
    exerciceBGH: 'au moins deux fois par année',
    code_en: 'National Fire Code of Canada 2020, incorporated into Chapter VIII of the Quebec Safety Code (CQLR, c. B-1.1, r. 3)',
    article_en: 'article 2.8',
    description_en: 'Quebec Safety Code (CQLR, c. B-1.1, r. 3)',
    articleFormation_en: 'Article 2.8.2.1, Sentence (3)(c), of the National Fire Code of Canada 2020 (Quebec amended)',
    articleExercice_en: 'article 2.8.3.2 of the National Fire Code of Canada 2020, incorporated into Chapter VIII of the Quebec Safety Code',
    articleRevision_en: 'Article 2.8.2.1, Sentence (2), of the National Fire Code of Canada 2020 (Quebec amended)',
    exerciceStandard_en: 'at least once per year',
    exerciceBGH_en: 'at least twice per year',
  },
  Ontario: {
    code: 'Ontario Fire Code (O. Reg. 213/07) sous la Loi sur la prévention et la protection contre l\'incendie, 1997 (FPPA)',
    article: 'Division B, Section 2.8',
    description: 'Ontario Fire Code (O. Reg. 213/07)',
    articleFormation: 'Division B, Section 2.8 de l\'Ontario Fire Code (O. Reg. 213/07)',
    articleExercice: 'Division B, Section 2.8 de l\'Ontario Fire Code (O. Reg. 213/07)',
    articleRevision: 'Division B, Section 2.8 de l\'Ontario Fire Code (O. Reg. 213/07)',
    exerciceStandard: 'au moins une fois par année',
    exerciceBGH: 'aux trois mois (minimum 4 fois par année)',
    code_en: 'Ontario Fire Code (O. Reg. 213/07) under the Fire Protection and Prevention Act, 1997 (FPPA)',
    article_en: 'Division B, Section 2.8',
    description_en: 'Ontario Fire Code (O. Reg. 213/07)',
    articleFormation_en: 'Division B, Section 2.8 of the Ontario Fire Code (O. Reg. 213/07)',
    articleExercice_en: 'Division B, Section 2.8 of the Ontario Fire Code (O. Reg. 213/07)',
    articleRevision_en: 'Division B, Section 2.8 of the Ontario Fire Code (O. Reg. 213/07)',
    exerciceStandard_en: 'at least once per year',
    exerciceBGH_en: 'every three months (minimum 4 times per year)',
  },
  Alberta: {
    code: 'National Fire Code – 2023 Alberta Edition (NFC(AE))',
    article: 'Section 2.8',
    description: 'National Fire Code – 2023 Alberta Edition (NFC(AE)) sous la Safety Codes Act',
    articleFormation: 'article 2.8.2.1, phrase (3), alinéa (c), du NFC(AE)',
    articleExercice: 'article 2.8.3.2 du National Fire Code – 2023 Alberta Edition (NFC(AE))',
    articleRevision: 'article 2.8.2.1, phrase (2), du NFC(AE)',
    exerciceStandard: 'au moins une fois par année (intervalles max 12 mois)',
    exerciceBGH: 'aux deux mois (minimum 6 fois par année)',
    code_en: 'National Fire Code – 2023 Alberta Edition (NFC(AE))',
    article_en: 'Section 2.8',
    description_en: 'National Fire Code – 2023 Alberta Edition (NFC(AE)) under the Safety Codes Act',
    articleFormation_en: 'Article 2.8.2.1, Sentence (3), Clause (c), of the NFC(AE)',
    articleExercice_en: 'Article 2.8.3.2 of the National Fire Code – 2023 Alberta Edition (NFC(AE))',
    articleRevision_en: 'Article 2.8.2.1, Sentence (2), of the NFC(AE)',
    exerciceStandard_en: 'at least once per year (maximum 12-month intervals)',
    exerciceBGH_en: 'every two months (minimum 6 times per year)',
  },
};
/** « à l'article 2.8 », « à la section 2.8 », « à la Division B, Section 2.8 ». */
export function aRef(reference: string): string {
  return /^[aeiouyéèêh]/i.test(reference) ? `à l'${reference}` : `à la ${reference}`;
}

/** « l'article 2.8 », « la section 2.8 ». */
export function leRef(reference: string): string {
  return /^[aeiouyéèêh]/i.test(reference) ? `l'${reference}` : `la ${reference}`;
}

/** « du Code national… », « de l'Ontario Fire Code ». */
export function duRef(reference: string): string {
  return /^[aeiouyéèêh]/i.test(reference) ? `de l'${reference}` : `du ${reference}`;
}
