import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

/** Local deterministic projection for QA and retrieval tests; never calls a provider. */
@Injectable()
export class DeterministicEmbeddingService {
  static readonly dimension = 64;
  readonly provider = 'LOCAL_DETERMINISTIC_V1';

  embed(text: string): number[] {
    const vector = Array<number>(DeterministicEmbeddingService.dimension).fill(0);
    const terms =
      text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]+/g) ?? [];
    for (const term of terms) {
      const digest = createHash('sha256').update(term).digest();
      const index = digest.readUInt16BE(0) % vector.length;
      vector[index] += digest[2] % 2 ? 1 : -1;
    }
    const norm = Math.hypot(...vector);
    return norm ? vector.map((value) => value / norm) : vector;
  }

  validate(vector: number[]) {
    if (
      vector.length !== DeterministicEmbeddingService.dimension ||
      vector.some((value) => !Number.isFinite(value))
    )
      throw new Error('INVALID_EMBEDDING');
    return vector;
  }
}
