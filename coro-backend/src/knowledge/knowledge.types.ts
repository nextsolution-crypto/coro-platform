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
      clientId?: string;
      buildingIds: string[];
    };

export interface ExtractedPage {
  pageNumber: number;
  sectionPath?: string;
  text: string;
  extractionMethod?: 'NATIVE_TEXT' | 'LOCAL_OCR';
}

export interface KnowledgeSearchHit {
  sourceType?: 'PROJECT_FILE' | 'LIBRARY_PROCEDURE';
  sourceReference?: string;
  sourceVersion?: string;
  sourceFingerprint?: string;
  sourceScope?: 'GLOBAL' | 'ORGANIZATION' | 'PROJECT';
  href?: string;
  chunkId: string;
  citationId: string;
  projectFileId?: string;
  projectFileVersion?: number;
  documentName: string;
  buildingId: string;
  pageStart: number;
  pageEnd: number;
  sectionPath: string | null;
  text: string;
  score: number;
  sourceSha256?: string;
}
