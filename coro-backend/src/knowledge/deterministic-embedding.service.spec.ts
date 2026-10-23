import { DeterministicEmbeddingService } from './deterministic-embedding.service';

describe('DeterministicEmbeddingService', () => {
  const service = new DeterministicEmbeddingService();

  it('produces stable normalized local embeddings', () => {
    const first = service.embed('vanne principale eau');
    const second = service.embed('vanne principale eau');
    expect(first).toEqual(second);
    expect(first).toHaveLength(64);
    expect(Math.hypot(...first)).toBeCloseTo(1, 8);
    expect(service.validate(first)).toEqual(first);
  });

  it('rejects an invalid vector instead of storing it', () => {
    expect(() => service.validate([1, 2])).toThrow('INVALID_EMBEDDING');
  });
});
