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
    articleFormation: 'article 2.8.2.1 (3) du CNPI 2020 modifié',
    articleExercice: 'article 2.8.3.2 du Code national de prévention des incendies – Canada 2020, incorporé au Chapitre VIII du Code de sécurité du Québec',
    articleRevision: 'article 2.8.2.1 (4) du Code national de prévention des incendies – Canada 2020',
    exerciceStandard: 'au moins une fois par année',
    exerciceBGH: 'au moins deux fois par année',
    code_en: 'National Fire Code of Canada 2020, incorporated into Chapter VIII of the Quebec Safety Code (CQLR, c. B-1.1, r. 3)',
    article_en: 'article 2.8',
    description_en: 'Quebec Safety Code (CQLR, c. B-1.1, r. 3)',
    articleFormation_en: 'article 2.8.2.1 (3) of the amended NFCC 2020',
    articleExercice_en: 'article 2.8.3.2 of the National Fire Code of Canada 2020, incorporated into Chapter VIII of the Quebec Safety Code',
    articleRevision_en: 'article 2.8.2.1 (4) of the National Fire Code of Canada 2020',
    exerciceStandard_en: 'at least once per year',
    exerciceBGH_en: 'at least twice per year',
  },
  Ontario: {
    code: 'Ontario Fire Code (O. Reg. 213/07) sous la Loi sur la prévention et la protection contre l\'incendie, 1997 (FPPA)',
    article: 'Division B, Section 2.8',
    description: 'Ontario Fire Code (O. Reg. 213/07)',
    articleFormation: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
    articleExercice: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
    articleRevision: 'Division B, Section 2.8 du Ontario Fire Code (O. Reg. 213/07)',
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
    articleFormation: 'article 2.8.2.1 (3) du NFC(AE)',
    articleExercice: 'article 2.8.3.1 du National Fire Code – 2023 Alberta Edition (NFC(AE))',
    articleRevision: 'article 2.8.2.1 (4) du NFC(AE)',
    exerciceStandard: 'au moins une fois par année (intervalles max 12 mois)',
    exerciceBGH: 'aux deux mois (minimum 6 fois par année)',
    code_en: 'National Fire Code – 2023 Alberta Edition (NFC(AE))',
    article_en: 'Section 2.8',
    description_en: 'National Fire Code – 2023 Alberta Edition (NFC(AE)) under the Safety Codes Act',
    articleFormation_en: 'article 2.8.2.1 (3) of the NFC(AE)',
    articleExercice_en: 'article 2.8.3.1 of the National Fire Code – 2023 Alberta Edition (NFC(AE))',
    articleRevision_en: 'article 2.8.2.1 (4) of the NFC(AE)',
    exerciceStandard_en: 'at least once per year (maximum 12-month intervals)',
    exerciceBGH_en: 'every two months (minimum 6 times per year)',
  },
};