import { createHash } from 'crypto';
import { KnowledgeConfig } from '../src/knowledge/knowledge.config';
import { KnowledgeExtractorService } from '../src/knowledge/knowledge-extractor.service';
import { BedrockProviderAdapter } from '../src/knowledge/bedrock-provider.adapter';
import { fixturePdf } from './knowledge-runtime-smoke';
import { DeterministicEmbeddingService } from '../src/knowledge/deterministic-embedding.service';
import {
  cosine,
  SemanticEmbeddingService,
  TITAN_EMBEDDING_MODEL,
  TITAN_MODEL_ID,
} from '../src/knowledge/semantic-embedding.service';

/**
 * CORO Knowledge : vérifie, sur des phrases fictives, que Titan répond depuis
 * ca-central-1 et qu'il rapproche bien deux textes de même sens.
 */
async function semanticSmoke(config: KnowledgeConfig) {
  if (config.embeddingProvider !== 'bedrock-titan-v2') return { status: 'DISABLED' };
  // Titan est une amélioration avec repli automatique : son échec est
  // consigné dans la preuve de déploiement mais ne bloque pas la version,
  // et surtout ne retire pas les identifiants dont CORO AI a besoin.
  const service = new SemanticEmbeddingService(config, new DeterministicEmbeddingService());
  try {
    config.assertEmbeddingActivation();
    const question = await service.embedQuery('Où se trouve la sortie de secours la plus proche ?');
    const related = await service.embedDocument("Évacuation : empruntez l'issue de secours de l'escalier nord.");
    const unrelated = await service.embedDocument('Recette du gâteau au chocolat de la cafétéria.');
    if (!question || related.model !== TITAN_EMBEDDING_MODEL || unrelated.model !== TITAN_EMBEDDING_MODEL)
      return { status: 'DEGRADED_LOCAL_FALLBACK', model: TITAN_MODEL_ID, region: config.embeddingRegion,
        failure: service.lastFailure };
    const near = cosine(question, related.vector);
    const far = cosine(question, unrelated.vector);
    return { status: near > far ? 'PASS' : 'DEGRADED_SIMILARITY_CHECK', model: TITAN_MODEL_ID,
      region: config.embeddingRegion, dimensions: question.length, syntheticOnly: true,
      similarityRelated: Number(near.toFixed(3)), similarityUnrelated: Number(far.toFixed(3)) };
  } catch {
    return { status: 'DEGRADED_LOCAL_FALLBACK', model: TITAN_MODEL_ID,
      failure: service.lastFailure ?? { errorName: 'ACTIVATION_REFUSED', httpStatusCode: null } };
  }
}

async function main() {
  const config = new KnowledgeConfig();
  const semanticEmbeddings = await semanticSmoke(config);
  if (config.aiProvider !== 'bedrock') {
    console.log(JSON.stringify({ status: 'DISABLED', provider: 'DETERMINISTIC_SIMULATED', semanticEmbeddings }));
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
    syntheticOnly: true, canonicalProjectFileCreated: false, citationValidated: true,
    semanticEmbeddings }));
}

main().catch(() => {
  console.error('KNOWLEDGE_PROVIDER_SMOKE_FAILED');
  process.exitCode = 1;
});
