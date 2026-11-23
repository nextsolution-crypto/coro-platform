/*
 * Vérifie au build de l'image que le modèle local de CORO Knowledge se
 * charge sans réseau et rapproche bien les textes de même sens. Les
 * similarités mesurées sont publiées dans le journal pour calibrer
 * CORO_KNOWLEDGE_LOCAL_SIMILARITY_FLOOR_PERMILLE / _SPAN_PERMILLE.
 */
import { LocalEmbeddingEngine } from '../src/knowledge/local-embedding.engine';
import { cosine } from '../src/knowledge/semantic-embedding.service';

const CASES: Array<[string, string, string]> = [
  [
    'Où se trouve la sortie de secours la plus proche ?',
    "Évacuation : empruntez l'issue de secours de l'escalier nord, puis rendez-vous au point de rassemblement.",
    'Recette du gâteau au chocolat servi à la cafétéria.',
  ],
  [
    'Qui est responsable de la fermeture des valves de gaz ?',
    "Le préposé à l'entretien coupe l'alimentation en gaz naturel au robinet principal du sous-sol.",
    "Les heures d'ouverture du stationnement sont de 6 h à 22 h.",
  ],
  [
    'Where do occupants gather after leaving the building?',
    'Assembly point: the north parking lot, across from the main entrance.',
    'The quarterly invoice is payable within thirty days.',
  ],
];

async function main() {
  const engine = new LocalEmbeddingEngine();
  if (!engine.modelPresent()) throw new Error('LOCAL_EMBEDDING_MODEL_MISSING');
  const started = Date.now();
  const results: Array<{ related: number; unrelated: number }> = [];
  for (const [question, related, unrelated] of CASES) {
    const query = await engine.embed('query', question);
    const near = cosine(query, await engine.embed('passage', related));
    const far = cosine(query, await engine.embed('passage', unrelated));
    if (!(near > far)) throw new Error('LOCAL_EMBEDDING_SMOKE_FAILED');
    results.push({ related: Number(near.toFixed(3)), unrelated: Number(far.toFixed(3)) });
  }
  await engine.unload();
  console.log(
    JSON.stringify({
      status: 'PASS',
      model: 'Xenova/multilingual-e5-small',
      dimensions: 384,
      elapsedMs: Date.now() - started,
      rssMiB: Math.round(process.memoryUsage().rss / 1048576),
      similarities: results,
    }),
  );
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
