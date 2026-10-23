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
      (hit) => !this.suspicious(hit.text) && hit.score >= 0.25 && this.coversQuestion(question, [hit]),
    );
    if (!usable.length)
      return {
        answer: null,
        uncertainty: 'Aucune source ProjectFile admissible ne permet de répondre.',
        missingInformation: ['Information absente des versions approuvées accessibles.'],
        conflicts: [],
        usedCitationIds: [],
      };
    const conflicts = this.conflicts(usable, question);
    if (conflicts.length) return { answer: null,
      uncertainty: 'Les sources accessibles se contredisent ; aucune valeur ne peut être retenue.',
      missingInformation: [], conflicts, usedCitationIds: [...new Set(usable.map(hit => hit.citationId))] };
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

  admissibleHits(question: string, hits: KnowledgeSearchHit[]) {
    return hits.filter(hit => this.coversQuestion(question, [hit]));
  }

  /** Conservative lexical admission, before either provider: a citation alone
   * cannot establish that an unrelated named subject exists in its source.
   * Unknown vocabulary abstains rather than letting the model fill a gap. */
  private coversQuestion(question: string, hits: KnowledgeSearchHit[]) {
    const requestedVersion = /\bversion\s+v?(\d+)\b/i.exec(question);
    if (requestedVersion && !hits.some(hit => hit.projectFileVersion === Number(requestedVersion[1]))) return false;
    const scaffolding = new Set([
      'quels', 'quelles', 'comment', 'pourquoi', 'combien', 'trouve', 'trouver', 'situe', 'situee',
      'selon', 'indique', 'indiquent', 'peux', 'pouvez', 'dire', 'donne', 'donner', 'moi', 'nous', 'vous',
      'svp', 'stp', 'please', 'what', 'where', 'is', 'are', 'does', 'the', 'this', 'that', 'and',
      'or', 'which', 'how', 'can', 'could', 'tell', 'me', 'about', 'according', 'document', 'documents',
      'source', 'sources', 'approuve', 'approuvee', 'approuves', 'approuvees', 'actuel', 'actuelle',
      'version', 'versions', 'objet', 'objets', 'fictif', 'fictive', 'fictifs', 'synthetique', 'synthetiques',
      'resume', 'resumer', 'synthese', 'compare', 'comparer', 'difference', 'entre',
      'je', 'veux', 'voudrais', 'savoir', 'connaitre', 'connais', 'indiquer', 'qu', 'que', 'quoi',
      'cela', 'ceci', 'cette', 'cet', 'sur', 'avec', 'plan', 'plans',
    ]);
    const stem = (term: string) => {
      const singular = term.length > 4 ? term.replace(/s$/, '') : term;
      return singular.length > 6 ? singular.replace(/e$/, '') : singular;
    };
    const anchors = [...this.terms(question)].filter(term => !scaffolding.has(term)).map(stem);
    const evidence = new Set(hits.flatMap(hit => [...this.terms([
      hit.text, hit.documentName ?? '', hit.sectionPath ?? '', 'sha256', hit.sourceSha256 ?? '',
    ].join(' '))].map(stem)));
    return anchors.every(term => evidence.has(term));
  }

  private conflicts(hits: KnowledgeSearchHit[], question: string) {
    const query = this.terms(question);
    const facts = new Map<string, Set<string>>();
    for (const hit of hits) for (const sentence of hit.text.split(/[\n.!?]+/)) {
      const normalized = sentence.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      const values = normalized.match(/\b\d+(?:[.,]\d+)?\b/g);
      if (!values || ![...this.terms(normalized)].some(term => query.has(term))) continue;
      const signature = normalized.replace(/\b\d+(?:[.,]\d+)?\b/g, '#').replace(/\s+/g, ' ');
      const variants = facts.get(signature) ?? new Set<string>();
      variants.add(values.join('|')); facts.set(signature, variants);
    }
    return [...facts.values()].some(variants => variants.size > 1)
      ? ['Valeurs numériques divergentes pour un même fait dans les sources citées.'] : [];
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
