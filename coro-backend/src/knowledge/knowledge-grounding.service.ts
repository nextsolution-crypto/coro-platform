import { Injectable } from '@nestjs/common';
import { KnowledgeSearchHit } from './knowledge.types';

export interface GroundedAnswer {
  answer: string | null;
  uncertainty: string | null;
  missingInformation: string[];
  conflicts: string[];
  usedCitationIds: string[];
}

@Injectable()
export class KnowledgeGroundingService {
  private readonly injection =
    /(?:ignore|oublie|bypass|contourne).{0,40}(?:instruction|regle|autorisation|system)|\b(system prompt|developer message)\b/i;

  suspicious(value: string) {
    return this.injection.test(
      value.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    );
  }

  answer(question: string, hits: KnowledgeSearchHit[]): GroundedAnswer {
    if (this.suspicious(question))
      return {
        answer: null,
        uncertainty: 'La demande contient des instructions incompatibles avec la politique de sécurité.',
        missingInformation: [],
        conflicts: [],
        usedCitationIds: [],
      };
    const usable = hits.filter(
      (hit) => !this.suspicious(hit.text) && hit.score >= 0.25,
    );
    if (!usable.length)
      return {
        answer: null,
        uncertainty: 'Aucune source ProjectFile admissible ne permet de répondre.',
        missingInformation: ['Information absente des versions approuvées accessibles.'],
        conflicts: [],
        usedCitationIds: [],
      };
    const conflicts = this.conflicts(usable);
    const source = usable[0];
    const questionTerms = this.terms(question);
    const sentence = source.text
      .split(/(?<=[.!?])\s+/)
      .filter((candidate) => candidate.trim().length >= 20)
      .map((candidate, index) => ({
        candidate,
        index,
        overlap: [...this.terms(candidate)].filter((term) => questionTerms.has(term)).length,
      }))
      .sort((left, right) => right.overlap - left.overlap || left.index - right.index)[0]
      ?.candidate ?? source.text.slice(0, 500);
    return {
      answer: sentence.trim(),
      uncertainty: conflicts.length
        ? 'Des sources accessibles contiennent des informations potentiellement contradictoires.'
        : 'Réponse déterministe limitée aux extraits ProjectFile cités.',
      missingInformation: [],
      conflicts,
      usedCitationIds: [source.citationId],
    };
  }

  private conflicts(hits: KnowledgeSearchHit[]) {
    const numeric = hits
      .slice(0, 5)
      .map((hit) => ({
        id: hit.citationId,
        values: [...new Set(hit.text.match(/\b\d+(?:[.,]\d+)?\b/g) ?? [])],
      }))
      .filter((item) => item.values.length);
    if (numeric.length < 2) return [];
    const signatures = new Set(numeric.map((item) => item.values.join('|')));
    return signatures.size > 1
      ? ['Valeurs numériques divergentes entre les sources citées.']
      : [];
  }

  private terms(value: string) {
    const stopWords = new Set([
      'au', 'aux', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'elle', 'en', 'est',
      'et', 'il', 'la', 'le', 'les', 'ou', 'pour', 'quel', 'quelle', 'se', 'un', 'une',
    ]);
    return new Set(
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .match(/[a-z0-9]{2,}/g)
        ?.filter((term) => !stopWords.has(term)) ?? [],
    );
  }
}
