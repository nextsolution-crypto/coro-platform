import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeNormalizer } from './knowledge-normalizer';
import { ExtractedPage } from './knowledge.types';

export interface PreparedChunk {
  id: string;
  ordinal: number;
  pageStart: number;
  pageEnd: number;
  sectionPath: string | null;
  sectionTitle: string | null;
  text: string;
  contentHash: string;
  tokenCountApprox: number;
  characterCount: number;
}

@Injectable()
export class KnowledgeChunkerService {
  constructor(
    private readonly config: KnowledgeConfig,
    private readonly normalizer: KnowledgeNormalizer,
  ) {}

  chunks(pages: ExtractedPage[]): PreparedChunk[] {
    const result: PreparedChunk[] = [];
    let sectionPath: string | null = null;
    let sectionTitle: string | null = null;
    for (const page of pages) {
      const normalized = this.normalizer.normalize(page.text);
      const lines = normalized.split('\n');
      const heading = lines.find((line) => /^(?:Section\s+)?\d+(?:\.\d+)*\.?[\s—–-]+.{2,160}$/i.test(line));
      if (heading) {
        sectionTitle = heading;
        sectionPath = heading.match(/^(?:Section\s+)?(\d+(?:\.\d+)*)/i)?.[1] ?? null;
      }
      let cursor = 0;
      while (cursor < normalized.length) {
        let end = Math.min(
          normalized.length,
          cursor + this.config.chunkTargetCharacters,
        );
        if (end < normalized.length) {
          const boundary = Math.max(
            normalized.lastIndexOf('\n', end),
            normalized.lastIndexOf('. ', end),
          );
          if (boundary > cursor + 200) end = boundary + 1;
        }
        const text = normalized.slice(cursor, end).trim();
        if (text) {
          result.push({
            id: randomUUID(),
            ordinal: result.length,
            pageStart: page.pageNumber,
            pageEnd: page.pageNumber,
            sectionPath,
            sectionTitle,
            text,
            contentHash: createHash('sha256').update(text).digest('hex'),
            tokenCountApprox: Math.ceil(text.length / 4),
            characterCount: text.length,
          });
        }
        if (end >= normalized.length) break;
        cursor = Math.max(cursor + 1, end - this.config.chunkOverlapCharacters);
      }
    }
    return result;
  }
}
