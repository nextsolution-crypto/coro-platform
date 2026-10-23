import { KnowledgeChunkerService } from './knowledge-chunker.service';
import { KnowledgeConfig } from './knowledge.config';
import { KnowledgeNormalizer } from './knowledge-normalizer';

describe('KnowledgeChunkerService canonical page and section provenance', () => {
  it('preserves numbered headings with trailing punctuation and French section labels', () => {
    const service = new KnowledgeChunkerService(new KnowledgeConfig(), new KnowledgeNormalizer());
    const chunks = service.chunks([
      { pageNumber: 1, text: '1. Portée\nCorpus de recette exclusivement fictif.' },
      { pageNumber: 2, text: '2. Tableau\nOrme CODE-ORME-031, valeur de recette fictive.' },
      { pageNumber: 3, text: 'Section 3.1 - Limites\nAucun numéro réel ne figure ici.' },
    ]);
    expect(chunks.map(c => [c.pageStart, c.pageEnd, c.sectionPath])).toEqual([
      [1, 1, '1'], [2, 2, '2'], [3, 3, '3.1'],
    ]);
  });
});
