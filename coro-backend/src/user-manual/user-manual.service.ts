import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  MANUAL_ARTICLES,
  MANUAL_VERSION,
  ManualAudience,
} from './user-manual.catalog';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
const stop = new Set(
  'comment faire pour dans avec est les des une mon mes son ses sur que qui quoi quel quelle quels quelles trouver acceder ouvrir consulter cette cela peux peut dois puis avoir voudrais besoin fonction fonctionne'.split(
    ' ',
  ),
);
const tokens = (s: string) => [
  ...new Set(
    (normalize(s).match(/[a-z0-9]+/g) ?? [])
      .filter((t) => t.length > 2 && !stop.has(t))
      .map((t) => (t.length > 4 ? t.replace(/s$/, '') : t)),
  ),
];

@Injectable()
export class UserManualService {
  list(audience: ManualAudience) {
    return {
      version: MANUAL_VERSION,
      sourceType: 'PRODUCT_MANUAL',
      articles: MANUAL_ARTICLES.filter((a) =>
        a.audience.includes(audience),
      ).map((a) => {
        const { sourceRefs, ...publicArticle } = a;
        return {
          ...publicArticle,
          version: MANUAL_VERSION,
          sha256: createHash('sha256').update(JSON.stringify(a)).digest('hex'),
          href: `/manual#${a.id}`,
        };
      }),
    };
  }
  get(audience: ManualAudience, id: string) {
    const result = this.list(audience).articles.find((a) => a.id === id);
    if (!result) throw new NotFoundException('Article indisponible.');
    return result;
  }
  ask(audience: ManualAudience, question: unknown) {
    if (
      typeof question !== 'string' ||
      question.trim().length < 3 ||
      question.length > 1000
    )
      throw new BadRequestException(
        'La question doit contenir entre 3 et 1000 caractères.',
      );
    const terms = tokens(question);
    const articles = this.list(audience)
      .articles.map((a) => {
        const keys = new Set(tokens([a.title, ...a.keywords].join(' ')));
        const matched = terms.filter((t) => keys.has(t));
        return {
          a,
          score: matched.length,
          coverage: matched.length / Math.max(1, terms.length),
        };
      })
      .filter((r) => r.score > 0 && r.coverage >= 0.5)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.coverage - a.coverage ||
          a.a.id.localeCompare(b.a.id),
      )
      .slice(0, 3)
      .map((r) => r.a);
    return {
      status: articles.length ? 'GUIDES_FOUND' : 'INSUFFICIENT_EVIDENCE',
      provider: 'USER_MANUAL_EXTRACTIVE',
      sourceType: 'PRODUCT_MANUAL',
      version: MANUAL_VERSION,
      explanation: articles.length
        ? 'Voici les instructions du manuel correspondant à votre demande.'
        : 'Aucune instruction suffisamment précise dans le manuel accessible. Essayez le nom de la fonction ou consultez les catégories.',
      articles,
    };
  }
}
