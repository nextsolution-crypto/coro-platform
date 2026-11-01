import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('public assistant catalogue isolation', () => {
  it('keeps the public chat wired only to PublicKnowledgeModule', () => {
    const moduleSource = readFileSync(
      join(__dirname, '..', 'chat', 'chat.module.ts'),
      'utf8',
    );
    const orchestrator = readFileSync(
      join(__dirname, '..', 'chat', 'public-assistant-orchestrator.service.ts'),
      'utf8',
    );
    expect(moduleSource).toContain('PublicKnowledgeModule');
    expect(moduleSource).not.toMatch(/import\s+\{\s*KnowledgeModule\s*\}/);
    expect(moduleSource).not.toContain('LibraryKnowledgeRetrievalService');
    expect(orchestrator).toContain('PublicKnowledgeSearchService');
    expect(orchestrator).not.toContain('LibraryKnowledgeRetrievalService');
  });
});
