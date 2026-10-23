import { createHash } from 'crypto';
import { KnowledgeConfig } from '../src/knowledge/knowledge.config';
import { KnowledgeExtractorService } from '../src/knowledge/knowledge-extractor.service';
import { BedrockProviderAdapter } from '../src/knowledge/bedrock-provider.adapter';
import { fixturePdf } from './knowledge-runtime-smoke';

async function main() {
  const config = new KnowledgeConfig();
  if (config.aiProvider !== 'bedrock') {
    console.log(JSON.stringify({ status: 'DISABLED', provider: 'DETERMINISTIC_SIMULATED' }));
    return;
  }
  config.assertBedrockActivation();
  const bytes = fixturePdf();
  const pages = await new KnowledgeExtractorService(config).extract(bytes, 'application/pdf');
  const citationId = 'release-synthetic-citation';
  const result = await new BedrockProviderAdapter(config).answer(
    'Quel est le code de validation technique de ce document fictif ?',
    [{ chunkId: 'release-synthetic-chunk', citationId, projectFileId: 'release-synthetic-file',
      projectFileVersion: 1, documentName: 'DOCUMENT FICTIF RELEASE', buildingId: 'synthetic',
      pageStart: 1, pageEnd: 1, sectionPath: null, text: pages[0].text, score: 1,
      sourceSha256: createHash('sha256').update(bytes).digest('hex') }],
  );
  if (!result.answer?.includes('CORO-KNOWLEDGE-2026') ||
      result.usedCitationIds.length !== 1 || result.usedCitationIds[0] !== citationId)
    throw new Error('KNOWLEDGE_PROVIDER_SMOKE_FAILED');
  console.log(JSON.stringify({ status: 'PASS', provider: 'AWS_BEDROCK_CA_CENTRAL_1',
    region: config.bedrockRegion, model: config.bedrockModelId, sessionSeconds: 900,
    syntheticOnly: true, canonicalProjectFileCreated: false, citationValidated: true }));
}

main().catch(() => {
  console.error('KNOWLEDGE_PROVIDER_SMOKE_FAILED');
  process.exitCode = 1;
});
