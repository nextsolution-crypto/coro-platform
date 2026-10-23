export type KnowledgeActor =
  | {
      type: 'INTERNAL_USER';
      id: string;
      organizationId: string;
      role: string;
    }
  | {
      type: 'CLIENT_USER';
      id: string;
      organizationId: string;
      role: 'CLIENT_MANAGER' | 'CLIENT_CORPORATE';
      buildingIds: string[];
    };

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  extractionMethod?: 'NATIVE_TEXT' | 'LOCAL_OCR';
}

export interface KnowledgeSearchHit {
  chunkId: string;
  citationId: string;
  projectFileId: string;
  projectFileVersion: number;
  documentName: string;
  buildingId: string;
  pageStart: number;
  pageEnd: number;
  sectionPath: string | null;
  text: string;
  score: number;
  sourceSha256: string;
}
